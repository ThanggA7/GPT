class ChatBot {
    constructor() {
        this.currentChatId = null;
        this.chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        this.settings = JSON.parse(localStorage.getItem('chatSettings') || '{"temperature": 0.7, "theme": "light"}');
        
        this.initializeMarkdown();
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeTheme();
        this.loadChatHistory();
        this.initializeMobileFeatures();
    }

    initializeMarkdown() {
        // Configure marked.js
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (err) {}
                    }
                    return code;
                },
                breaks: true,
                gfm: true,
                tables: true,
                sanitize: false
            });
        }

        // Configure highlight.js
        if (typeof hljs !== 'undefined') {
            hljs.configure({
                languages: ['javascript', 'python', 'java', 'c', 'cpp', 'html', 'css', 'sql', 'bash', 'json', 'xml', 'markdown']
            });
        }
    }

    initializeElements() {
        // Sidebar elements
        this.sidebar = document.getElementById('sidebar');
        this.openSidebarBtn = document.getElementById('openSidebar');
        this.closeSidebarBtn = document.getElementById('closeSidebar');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        // Main content elements
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatContainer = document.getElementById('chatContainer');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.chatTitle = document.getElementById('chatTitle');
        this.chatSubtitle = document.getElementById('chatSubtitle');
        
        // Input elements
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.charCount = document.getElementById('charCount');
        this.imageInput = document.getElementById('imageInput');
        this.fileInput = document.getElementById('fileInput');
        this.attachImageBtn = document.getElementById('attachImageBtn');
        this.attachFileBtn = document.getElementById('attachFileBtn');
        this.attachedImages = document.getElementById('attachedImages');
        this.attachedFiles = document.getElementById('attachedFiles');
        
        // Modal elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModalBtn = document.getElementById('closeSettingsModal');
        this.temperatureSlider = document.getElementById('temperatureSlider');
        this.temperatureValue = document.getElementById('temperatureValue');
        
        // Image viewer modal elements
        this.imageViewerModal = document.getElementById('imageViewerModal');
        this.closeImageViewer = document.getElementById('closeImageViewer');
        this.viewerImage = document.getElementById('viewerImage');
        this.viewerImageName = document.getElementById('viewerImageName');
        this.downloadImage = document.getElementById('downloadImage');
        this.copyImageUrl = document.getElementById('copyImageUrl');
        
        // Theme elements
        this.themeToggle = document.getElementById('themeToggle');
        this.themeOptions = document.querySelectorAll('.theme-option');
        
        // Other elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.promptCards = document.querySelectorAll('.prompt-card');
        
        // Image handling
        this.selectedImages = [];
        this.selectedFiles = [];
    }

    initializeEventListeners() {
        // Sidebar events
        this.openSidebarBtn?.addEventListener('click', () => this.toggleSidebar(true));
        this.closeSidebarBtn?.addEventListener('click', () => this.toggleSidebar(false));
        this.newChatBtn?.addEventListener('click', () => this.startNewChat());
        this.clearHistoryBtn?.addEventListener('click', () => this.clearChatHistory());
        
        // Message form events
        this.messageForm?.addEventListener('submit', (e) => this.handleSubmit(e));
        this.messageInput?.addEventListener('input', () => this.handleInputChange());
        this.messageInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Image upload events
        this.attachImageBtn?.addEventListener('click', () => this.imageInput.click());
        this.attachFileBtn?.addEventListener('click', () => this.fileInput.click());
        this.imageInput?.addEventListener('change', (e) => this.handleImageSelect(e));
        this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Image viewer events
        this.closeImageViewer?.addEventListener('click', () => this.closeImageViewerModal());
        this.downloadImage?.addEventListener('click', () => this.downloadCurrentImage());
        this.copyImageUrl?.addEventListener('click', () => this.copyCurrentImageUrl());
        
        // Settings events
        this.settingsBtn?.addEventListener('click', () => this.openSettings());
        this.closeSettingsModalBtn?.addEventListener('click', () => this.closeSettings());
        this.temperatureSlider?.addEventListener('input', (e) => this.updateTemperature(e.target.value));
        
        // Theme events
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());
        this.themeOptions?.forEach(option => {
            option.addEventListener('click', () => this.setTheme(option.dataset.theme));
        });
        
        // Prompt card events
        this.promptCards?.forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                this.messageInput.value = prompt;
                this.handleInputChange();
                this.hideWelcomeScreen();
            });
        });
        
        // Outside click events
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // Resize events
        window.addEventListener('resize', () => this.handleResize());
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleSidebar(open) {
        const overlay = document.querySelector('.mobile-overlay');
        
        if (open) {
            this.sidebar.classList.add('open');
            if (overlay && window.innerWidth <= 768) {
                overlay.classList.add('active');
                document.body.classList.add('menu-open');
            }
        } else {
            this.sidebar.classList.remove('open');
            if (overlay) {
                overlay.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        }
    }

    handleOutsideClick(e) {
        if (window.innerWidth <= 768) {
            if (this.sidebar.classList.contains('open') && 
                !this.sidebar.contains(e.target) && 
                !this.openSidebarBtn.contains(e.target)) {
                this.toggleSidebar(false);
            }
        }
        
        if (this.settingsModal.classList.contains('visible') && 
            !this.settingsModal.querySelector('.modal').contains(e.target)) {
            this.closeSettings();
        }
        
        if (this.imageViewerModal?.classList.contains('visible') && 
            !this.imageViewerModal.querySelector('.image-viewer-modal').contains(e.target)) {
            this.closeImageViewerModal();
        }
    }

    handleResize() {
        if (window.innerWidth > 768) {
            this.sidebar.classList.remove('open');
        }
    }

    startNewChat() {
        this.currentChatId = Date.now().toString();
        this.messagesContainer.innerHTML = '';
        this.selectedImages = [];
        this.selectedFiles = [];
        this.updateImagePreview();
        this.updateFilePreview();
        this.showWelcomeScreen();
        this.updateChatTitle('Cuộc trò chuyện mới', 'Tôi có thể giúp bạn điều gì hôm nay?');
        this.toggleSidebar(false);
        
        // Clear active history item
        this.historyList?.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    showWelcomeScreen() {
        this.welcomeScreen.classList.remove('hidden');
        this.chatContainer.classList.remove('visible');
    }

    hideWelcomeScreen() {
        this.welcomeScreen.classList.add('hidden');
        this.chatContainer.classList.add('visible');
    }

    updateChatTitle(title, subtitle) {
        this.chatTitle.textContent = title;
        this.chatSubtitle.textContent = subtitle;
    }

    handleInputChange() {
        const value = this.messageInput.value;
        const charLength = value.length;
        
        this.charCount.textContent = charLength;
        this.sendBtn.disabled = (charLength === 0 && this.selectedImages.length === 0 && this.selectedFiles.length === 0) || charLength > 4000;
        
        // Auto-resize textarea
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    handleImageSelect(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            if (file.type.startsWith('image/') && this.selectedImages.length < 4) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.selectedImages.push({
                        file: file,
                        dataUrl: event.target.result,
                        name: file.name
                    });
                    this.updateImagePreview();
                    this.handleInputChange(); // Update send button state
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Reset input
        e.target.value = '';
    }

    updateImagePreview() {
        if (this.selectedImages.length > 0) {
            this.attachedImages.style.display = 'flex';
            this.attachedImages.innerHTML = this.selectedImages.map((img, index) => `
                <div class="image-preview">
                    <img src="${img.dataUrl}" alt="${img.name}">
                    <button class="remove-image" onclick="window.chatBot.removeImage(${index})" title="Xóa ảnh">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        } else {
            this.attachedImages.style.display = 'none';
            this.attachedImages.innerHTML = '';
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            if (this.selectedFiles.length < 3) { // Limit 3 files
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.selectedFiles.push({
                        file: file,
                        content: event.target.result,
                        name: file.name,
                        size: this.formatFileSize(file.size),
                        type: file.type || 'text/plain'
                    });
                    this.updateFilePreview();
                    this.handleInputChange(); // Update send button state
                };
                
                if (file.type.startsWith('text/') || file.name.endsWith('.txt') || 
                    file.name.endsWith('.md') || file.name.endsWith('.js') || 
                    file.name.endsWith('.py') || file.name.endsWith('.html') ||
                    file.name.endsWith('.css') || file.name.endsWith('.json')) {
                    reader.readAsText(file);
                } else {
                    // For other file types, just store basic info
                    this.selectedFiles.push({
                        file: file,
                        name: file.name,
                        size: this.formatFileSize(file.size),
                        type: file.type || 'application/octet-stream',
                        content: `[File: ${file.name}]`
                    });
                    this.updateFilePreview();
                    this.handleInputChange();
                }
            }
        });
        
        // Reset input
        e.target.value = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    updateFilePreview() {
        if (this.selectedFiles.length > 0) {
            this.attachedFiles.style.display = 'flex';
            this.attachedFiles.innerHTML = this.selectedFiles.map((file, index) => `
                <div class="file-preview">
                    <div class="file-icon">
                        <i class="fas ${this.getFileIcon(file.name)}"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${file.size}</div>
                    </div>
                    <button class="remove-file" onclick="window.chatBot.removeFile(${index})" title="Xóa file">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        } else {
            this.attachedFiles.style.display = 'none';
            this.attachedFiles.innerHTML = '';
        }
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'txt': 'fa-file-alt',
            'md': 'fa-file-alt', 
            'js': 'fa-file-code',
            'py': 'fa-file-code',
            'html': 'fa-file-code',
            'css': 'fa-file-code',
            'json': 'fa-file-code',
            'xml': 'fa-file-code',
            'csv': 'fa-file-csv',
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel'
        };
        return iconMap[ext] || 'fa-file';
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFilePreview();
        this.handleInputChange();
    }

    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.updateImagePreview();
        this.handleInputChange();
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSubmit(e);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const message = this.messageInput.value.trim();
        const hasImages = this.selectedImages.length > 0;
        const hasFiles = this.selectedFiles.length > 0;
        
        if (!message && !hasImages && !hasFiles) return;
        
        this.hideWelcomeScreen();
        
        // Add user message with images and files
        this.addMessage('user', message, this.selectedImages, this.selectedFiles);
        
        // Clear input, images and files
        this.messageInput.value = '';
        const messagesToSend = [...this.selectedImages]; // Copy for API call
        const filesToSend = [...this.selectedFiles]; // Copy for API call
        this.selectedImages = [];
        this.selectedFiles = [];
        this.updateImagePreview();
        this.updateFilePreview();
        this.handleInputChange();
        
        // Show typing indicator
        const typingIndicator = this.addTypingIndicator();
        
        try {
            // Send message to API
            const response = await this.sendMessageToAPI(message, messagesToSend, filesToSend);
            
            // Remove typing indicator
            this.removeTypingIndicator(typingIndicator);
            
            // Add assistant response
            this.addMessage('assistant', response);
            
            // Save to history
            this.saveChatToHistory(message, response, messagesToSend, filesToSend);
            
        } catch (error) {
            this.removeTypingIndicator(typingIndicator);
            
            let errorMessage = 'Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn. Vui lòng thử lại.';
            
            if (error.message.includes('HTTP')) {
                errorMessage = `Lỗi kết nối: ${error.message}`;
            } else if (error.message.includes('API')) {
                errorMessage = `Lỗi từ AI service: ${error.message}`;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.addMessage('assistant', errorMessage);
            console.error('Chat Error:', error);
        }
    }

    addMessage(role, content, images = [], files = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const currentTime = new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let imagesHtml = '';
        if (images && images.length > 0) {
            imagesHtml = `
                <div class="message-images">
                    ${images.map((img, index) => `
                        <img src="${img.dataUrl || img.url}" alt="${img.name || 'Image'}" class="message-image" 
                             onclick="window.chatBot.openImageViewer('${img.dataUrl || img.url}', '${img.name || 'Image'}')">
                    `).join('')}
                </div>
            `;
        }
        
        let filesHtml = '';
        if (files && files.length > 0) {
            filesHtml = `
                <div class="message-files">
                    ${files.map(file => `
                        <div class="message-file" onclick="window.chatBot.downloadFile('${file.name}', '${file.content}')">
                            <div class="file-icon">
                                <i class="fas ${this.getFileIcon(file.name)}"></i>
                            </div>
                            <div class="file-info">
                                <div class="file-name">${file.name}</div>
                                <div class="file-size">${file.size}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${imagesHtml}
                    ${filesHtml}
                    ${content ? `<div class="message-text">${this.formatMessage(content)}</div>` : ''}
                </div>
                <div class="message-time">${currentTime}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        
        // Highlight code blocks if hljs is available
        if (typeof hljs !== 'undefined') {
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
        
        this.scrollToBottom();
    }

    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                    <span>AI đang soạn tin nhắn...</span>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
        return typingDiv;
    }

    removeTypingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    formatMessage(content) {
        if (!content) return '';
        
        let formatted = content;
        
        // Use marked.js if available for full markdown support
        if (typeof marked !== 'undefined') {
            try {
                formatted = marked.parse(content);
                
                // Sanitize HTML if DOMPurify is available
                if (typeof DOMPurify !== 'undefined') {
                    formatted = DOMPurify.sanitize(formatted, {
                        ALLOWED_TAGS: [
                            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                            'p', 'br', 'strong', 'em', 'u', 's', 'del',
                            'blockquote', 'code', 'pre',
                            'ul', 'ol', 'li',
                            'table', 'thead', 'tbody', 'tr', 'th', 'td',
                            'a', 'img',
                            'div', 'span'
                        ],
                        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'title', 'target', 'rel']
                    });
                }
                
                // Add copy buttons to code blocks
                formatted = this.addCopyButtonsToCodeBlocks(formatted);
                
            } catch (error) {
                console.warn('Markdown parsing failed, using fallback:', error);
                formatted = this.basicMarkdownFormat(content);
            }
        } else {
            // Fallback to basic markdown formatting
            formatted = this.basicMarkdownFormat(content);
        }
        
        return formatted;
    }

    basicMarkdownFormat(content) {
        // Basic markdown-like formatting as fallback
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        // Format code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
            const language = lang ? ` class="language-${lang}"` : '';
            return `<div class="code-block">
                ${lang ? `<div class="code-header">${lang}<button class="code-copy-btn" onclick="chatBot.copyCode(this)"><i class="fas fa-copy"></i></button></div>` : ''}
                <pre><code${language}>${code.trim()}</code></pre>
            </div>`;
        });
        
        return formatted;
    }

    addCopyButtonsToCodeBlocks(html) {
        // Add copy buttons to pre/code blocks
        return html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, code) => {
            const lang = attrs.match(/class="language-(\w+)"/);
            const language = lang ? lang[1] : '';
            
            return `<div class="code-block">
                ${language ? `<div class="code-header">${language}<button class="code-copy-btn" onclick="window.chatBot.copyCode(this)"><i class="fas fa-copy"></i> Copy</button></div>` : ''}
                <pre><code${attrs}>${code}</code></pre>
            </div>`;
        });
    }

    copyCode(button) {
        const codeBlock = button.closest('.code-block').querySelector('code');
        const code = codeBlock.textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            button.style.color = 'var(--success-color)';
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 100);
    }

    async sendMessageToAPI(message, images = [], files = []) {
        // Process message content with files
        let finalMessage = message || '';
        
        // Add file contents to message
        if (files.length > 0) {
            const fileContents = files.map(file => {
                return `\n\n**File: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\``;
            }).join('');
            
            if (finalMessage) {
                finalMessage += fileContents;
            } else {
                finalMessage = `Here are the uploaded files:${fileContents}`;
            }
        }
        
        // Ensure settings exist with default values
        if (!this.settings) {
            this.settings = { temperature: 0.7, theme: 'light' };
        }
        
        const temperature = this.settings.temperature || 0.7;
        
        console.log('Sending message to API:', { 
            message: finalMessage,
            imageCount: images.length,
            temperature: temperature, 
            hasImages: images.length > 0,
            hasFiles: files.length > 0
        });
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: finalMessage,
                    images: images.map(img => ({
                        data: img.dataUrl,
                        mimeType: img.type || 'image/jpeg'
                    })),
                    temperature: temperature
                }),
            });
            
            if (!response.ok) {
                console.error('HTTP Error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data.message || 'Xin lỗi, tôi không nhận được phản hồi từ AI.';
            
        } catch (error) {
            console.error('API Error:', error);
            
            // Check if it's a retryable error and we haven't exceeded max attempts
            if (this.shouldRetryError(error) && (this.currentRetryAttempt || 0) < 2) {
                this.currentRetryAttempt = (this.currentRetryAttempt || 0) + 1;
                console.log(`🔄 Retrying request... (attempt ${this.currentRetryAttempt + 1}/3)`);
                
                // Wait before retry with exponential backoff
                const waitTime = Math.pow(2, this.currentRetryAttempt) * 1000; // 2s, 4s
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                return this.sendMessageToAPI(finalMessage, images, files);
            }
            
            // Reset retry counter on final failure
            this.currentRetryAttempt = 0;
            throw error;
        }
    }

    shouldRetryError(error) {
        const retryableMessages = [
            'fetch failed',
            'network error', 
            'timeout',
            'AI đang quá tải',
            'không nhận được phản hồi',
            'HTTP 408',
            'HTTP 503',
            'HTTP 429',
            'quá tải'
        ];
        
        return retryableMessages.some(msg => 
            error.message.toLowerCase().includes(msg.toLowerCase())
        );
    }

    getCurrentChatMessages() {
        const messages = [];
        const messageElements = this.messagesContainer.querySelectorAll('.message:not(.typing)');
        
        messageElements.forEach(messageEl => {
            const isUser = messageEl.classList.contains('user');
            const textElement = messageEl.querySelector('.message-text');
            const imageElements = messageEl.querySelectorAll('.message-image');
            
            let content = '';
            if (textElement) {
                content = textElement.textContent;
            }
            
            // If has images, create multimodal content
            if (imageElements.length > 0) {
                const messageContent = [];
                if (content) {
                    messageContent.push({ type: 'text', text: content });
                }
                // Note: For API calls, we can't include images from previous messages
                // since we don't store them in a format Gemini can process
                // Only the current message images are sent
                content = messageContent.length > 0 ? messageContent : content;
            }
            
            messages.push({
                role: isUser ? 'user' : 'assistant',
                content: content
            });
        });
        
        return messages;
    }

    saveChatToHistory(userMessage, assistantResponse, images = [], files = []) {
        if (!this.currentChatId) return;
        
        let chat = this.chatHistory.find(c => c.id === this.currentChatId);
        if (!chat) {
            let title = userMessage ? 
                (userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '')) :
                '';
            
            if (!title && images.length > 0) title = `Ảnh (${images.length})`;
            if (!title && files.length > 0) title = `File (${files.length})`;
            if (!title) title = 'Cuộc trò chuyện';
                
            chat = {
                id: this.currentChatId,
                title: title,
                messages: [],
                createdAt: new Date().toISOString()
            };
            this.chatHistory.unshift(chat);
        }
        
        // Save user message with images and files
        const userMessageObj = {
            role: 'user',
            content: userMessage || '',
            timestamp: new Date().toISOString()
        };
        
        if (images && images.length > 0) {
            userMessageObj.images = images.map(img => ({
                name: img.name,
                dataUrl: img.dataUrl
            }));
        }
        
        if (files && files.length > 0) {
            userMessageObj.files = files.map(file => ({
                name: file.name,
                size: file.size,
                content: file.content,
                type: file.type
            }));
        }
        
        chat.messages.push(
            userMessageObj,
            { 
                role: 'assistant', 
                content: assistantResponse, 
                timestamp: new Date().toISOString() 
            }
        );
        
        chat.updatedAt = new Date().toISOString();
        
        // Keep only the last 50 chats
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(0, 50);
        }
        
        localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
        this.updateChatHistoryUI();
        this.updateChatTitle(chat.title, `${chat.messages.length} tin nhắn`);
    }

    loadChatHistory() {
        this.updateChatHistoryUI();
    }

    updateChatHistoryUI() {
        if (!this.historyList) return;
        
        this.historyList.innerHTML = '';
        
        this.chatHistory.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.chatId = chat.id;
            
            const lastMessage = chat.messages[chat.messages.length - 1];
            const preview = lastMessage ? lastMessage.content.substring(0, 60) + '...' : 'Không có tin nhắn';
            
            historyItem.innerHTML = `
                <div class="history-item-title">${chat.title}</div>
                <div class="history-item-preview">${preview}</div>
            `;
            
            historyItem.addEventListener('click', () => this.loadChat(chat.id));
            this.historyList.appendChild(historyItem);
        });
    }

    loadChat(chatId) {
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (!chat) return;
        
        this.currentChatId = chatId;
        this.messagesContainer.innerHTML = '';
        this.selectedImages = [];
        this.selectedFiles = [];
        this.updateImagePreview();
        this.updateFilePreview();
        this.hideWelcomeScreen();
        
        chat.messages.forEach(message => {
            const images = message.images || [];
            const files = message.files || [];
            this.addMessage(message.role, message.content, images, files);
        });
        
        this.updateChatTitle(chat.title, `${chat.messages.length} tin nhắn`);
        this.toggleSidebar(false);
        
        // Update active state
        this.historyList.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
        this.historyList.querySelector(`[data-chat-id="${chatId}"]`)?.classList.add('active');
    }

    clearChatHistory() {
        if (confirm('Bạn có chắc chắn muốn xóa tất cả lịch sử chat?')) {
            this.chatHistory = [];
            localStorage.removeItem('chatHistory');
            this.updateChatHistoryUI();
            this.startNewChat();
        }
    }

    // Settings methods
    openSettings() {
        // Ensure settings exist with default values
        if (!this.settings) {
            this.settings = { temperature: 0.7, theme: 'light' };
        }
        
        this.settingsModal.classList.add('visible');
        this.temperatureSlider.value = this.settings.temperature || 0.7;
        this.temperatureValue.textContent = this.settings.temperature || 0.7;
        
        // Update active theme option
        this.themeOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.theme === (this.settings.theme || 'light'));
        });
    }

    closeSettings() {
        this.settingsModal.classList.remove('visible');
    }

    updateTemperature(value) {
        // Ensure settings exist
        if (!this.settings) {
            this.settings = { temperature: 0.7, theme: 'light' };
        }
        
        this.settings.temperature = parseFloat(value);
        this.temperatureValue.textContent = value;
        localStorage.setItem('chatSettings', JSON.stringify(this.settings));
    }

    // Theme methods
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update syntax highlighting theme
        const lightTheme = document.getElementById('hljs-light');
        if (lightTheme) {
            lightTheme.disabled = theme === 'dark';
        }
        
        // Ensure settings exist
        if (!this.settings) {
            this.settings = { temperature: 0.7, theme: 'light' };
        }
        
        this.settings.theme = theme;
        localStorage.setItem('chatSettings', JSON.stringify(this.settings));
        
        // Update theme toggle icon
        const themeIcon = this.themeToggle?.querySelector('i');
        if (themeIcon) {
            themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        // Update active theme option
        this.themeOptions?.forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });
        
        // Re-highlight code blocks if hljs is available
        if (typeof hljs !== 'undefined') {
            setTimeout(() => {
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }, 100);
        }
    }

    // Image viewer methods
    openImageViewer(imageSrc, imageName) {
        this.viewerImage.src = imageSrc;
        this.viewerImageName.textContent = imageName;
        this.imageViewerModal.classList.add('visible');
        this.currentViewerImageSrc = imageSrc;
        this.currentViewerImageName = imageName;
    }

    closeImageViewerModal() {
        this.imageViewerModal.classList.remove('visible');
    }

    downloadCurrentImage() {
        if (this.currentViewerImageSrc) {
            const link = document.createElement('a');
            link.href = this.currentViewerImageSrc;
            link.download = this.currentViewerImageName || 'image';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    copyCurrentImageUrl() {
        if (this.currentViewerImageSrc) {
            navigator.clipboard.writeText(this.currentViewerImageSrc).then(() => {
                const button = this.copyImageUrl;
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                button.style.color = 'var(--success-color)';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy image URL:', err);
            });
        }
    }

    downloadFile(filename, content) {
        const link = document.createElement('a');
        const blob = new Blob([content], { type: 'text/plain' });
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
}

// Initialize the chat bot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatBot = new ChatBot();
});

// Handle page visibility change to pause/resume animations
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is not visible
        document.body.style.animationPlayState = 'paused';
    } else {
        // Resume animations when tab becomes visible
        document.body.style.animationPlayState = 'running';
    }
});

// Mobile responsive methods for ChatBot
ChatBot.prototype.handleMobileMenu = function() {
    // Create mobile overlay if not exists
    let overlay = document.querySelector('.mobile-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        document.body.appendChild(overlay);
    }
    
    // Close on overlay click
    overlay.addEventListener('click', () => {
        this.toggleSidebar(false);
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            this.scrollToBottom();
        }, 300);
    });
};

ChatBot.prototype.handleMobileKeyboard = function() {
    if (this.isMobile()) {
        // Handle virtual keyboard on mobile
        this.messageInput.addEventListener('focus', () => {
            setTimeout(() => {
                document.body.classList.add('keyboard-open');
                this.scrollToBottom();
            }, 300);
        });
        
        this.messageInput.addEventListener('blur', () => {
            document.body.classList.remove('keyboard-open');
            setTimeout(() => {
                this.scrollToBottom();
            }, 100);
        });
        
        // Prevent zoom on input focus (iOS)
        this.messageInput.style.fontSize = '16px';
    }
};

ChatBot.prototype.isMobile = function() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

ChatBot.prototype.handleTouchEvents = function() {
    let startY = 0;
    let startX = 0;
    
    document.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
    });
    
    document.addEventListener('touchmove', (e) => {
        // Prevent pull-to-refresh on mobile
        if (e.touches[0].clientY > startY && window.scrollY <= 0) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Swipe to open/close sidebar
    document.addEventListener('touchend', (e) => {
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        const overlay = document.querySelector('.mobile-overlay');
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
            if (deltaX > 0 && startX < 50) {
                // Swipe right from left edge - open sidebar
                this.toggleSidebar(true);
                if (overlay) {
                    overlay.classList.add('active');
                    document.body.classList.add('menu-open');
                }
            } else if (deltaX < 0 && this.sidebar.classList.contains('open')) {
                // Swipe left - close sidebar
                this.toggleSidebar(false);
                if (overlay) {
                    overlay.classList.remove('active');
                    document.body.classList.remove('menu-open');
                }
            }
        }
    });
};

ChatBot.prototype.initializeMobileFeatures = function() {
    this.handleMobileMenu();
    this.handleMobileKeyboard();
    this.handleTouchEvents();
    
    // Add mobile-specific styles
    if (this.isMobile()) {
        document.body.classList.add('is-mobile');
    }
};

// Add some utility functions
window.addEventListener('beforeunload', () => {
    // Save any pending data before the page unloads
    if (window.chatBot && window.chatBot.currentChatId) {
        localStorage.setItem('lastChatId', window.chatBot.currentChatId);
    }
});

// Auto-save functionality
setInterval(() => {
    if (window.chatBot && window.chatBot.chatHistory.length > 0) {
        localStorage.setItem('chatHistory', JSON.stringify(window.chatBot.chatHistory));
    }
}, 30000); // Save every 30 seconds
