$body = @{
    messages = @(@{
        role = "user"
        content = "Xin chào"
    })
    temperature = 0.7
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5500/api/chat" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
