$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Server running on http://localhost:8080"
Write-Host "Press Ctrl+C to stop the server"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $filePath = $request.Url.LocalPath
        if ($filePath -eq "/") {
            $filePath = "/index.html"
        }

        $fullPath = "D:\dev\repository\git\pdf-sign" + $filePath.Replace("/", "\")

        if (Test-Path $fullPath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $content.Length

            # Set content type
            $ext = [System.IO.Path]::GetExtension($fullPath)
            if ($ext -eq ".html") {
                $response.ContentType = "text/html"
            }
            elseif ($ext -eq ".css") {
                $response.ContentType = "text/css"
            }
            elseif ($ext -eq ".js") {
                $response.ContentType = "application/javascript"
            }
            elseif ($ext -eq ".json") {
                $response.ContentType = "application/json"
            }
            else {
                $response.ContentType = "application/octet-stream"
            }

            $response.OutputStream.Write($content, 0, $content.Length)
        }
        else {
            $response.StatusCode = 404
            $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
        }

        $response.OutputStream.Close()
    }
    catch {
        Write-Host "Error: $_"
    }
}


