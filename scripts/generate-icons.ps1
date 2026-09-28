Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\pooja\.gemini\antigravity-ide\brain\d4cdd4c2-995a-4d8f-b5bc-9992323659d5\.user_uploaded\media_1790617914348.jpg"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Generate-IconFile {
    param(
        [string]$outputPath,
        [int]$canvasSize,
        [int]$contentSize,
        [System.Drawing.Color]$bgColor,
        [bool]$isTransparent = $false
    )
    $bmp = New-Object System.Drawing.Bitmap $canvasSize, $canvasSize
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($isTransparent) {
        $gfx.Clear([System.Drawing.Color]::Transparent)
    } else {
        $gfx.Clear($bgColor)
    }

    $ratio = $srcImg.Width / $srcImg.Height
    if ($ratio -gt 1) {
        $drawW = $contentSize
        $drawH = [int]($contentSize / $ratio)
    } else {
        $drawH = $contentSize
        $drawW = [int]($contentSize * $ratio)
    }
    $x = [int](($canvasSize - $drawW) / 2)
    $y = [int](($canvasSize - $drawH) / 2)

    $gfx.DrawImage($srcImg, $x, $y, $drawW, $drawH)
    $gfx.Dispose()

    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated: $outputPath ($canvasSize x $canvasSize)"
}

# 1. Main App Icon (1024x1024, white background, content 740px)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\icon.png" 1024 740 ([System.Drawing.Color]::White) $false

# 2. Android Adaptive Foreground (1024x1024, transparent, safe zone 580px)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\android-icon-foreground.png" 1024 580 ([System.Drawing.Color]::Transparent) $true

# 3. Android Adaptive Background (1024x1024, pure white)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\android-icon-background.png" 1024 1024 ([System.Drawing.Color]::White) $false

# 4. Android Monochrome (1024x1024, transparent, 580px)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\android-icon-monochrome.png" 1024 580 ([System.Drawing.Color]::Transparent) $true

# 5. Splash Icon (512x512, transparent, 360px)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\splash-icon.png" 512 360 ([System.Drawing.Color]::Transparent) $true

# 6. Favicon (192x192, white bg, 150px)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\favicon.png" 192 150 ([System.Drawing.Color]::White) $false

# 7. Booffin Symbol (512x512, white bg, 460px)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\booffin-symbol.png" 512 460 ([System.Drawing.Color]::White) $false

# 8. Booffin Full Logo (512x512, white bg, 460px)
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\booffin-full-logo.jpg" 512 460 ([System.Drawing.Color]::White) $false

# 9. Public web icons
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\favicon.png" 192 150 ([System.Drawing.Color]::White) $false
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\icon-192.png" 192 150 ([System.Drawing.Color]::White) $false
Generate-IconFile "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\icon-512.png" 512 400 ([System.Drawing.Color]::White) $false

$srcImg.Dispose()
Write-Output "All icons successfully created!"
