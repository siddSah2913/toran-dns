$port = 8080
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Serving Toran DNS at http://localhost:$port/" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }

    $fullPath = Join-Path $root $path
    if (Test-Path $fullPath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($fullPath)
        $ext = [System.IO.Path]::GetExtension($fullPath)
        $mimeTypes = @{
            '.html' = 'text/html'
            '.js' = 'application/javascript'
            '.css' = 'text/css'
            '.png' = 'image/png'
            '.jpg' = 'image/jpeg'
            '.svg' = 'image/svg+xml'
            '.json' = 'application/json'
        }
        $response.ContentType = $mimeTypes[[System.IO.Path]::GetExtension($fullPath)]
        if (-not $response.ContentType) { $response.ContentType = 'application/octet-stream' }
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.OutputStream.Write($err, 0, $err.Length)
    }
    $response.Close()
}

$listener.Stop()
