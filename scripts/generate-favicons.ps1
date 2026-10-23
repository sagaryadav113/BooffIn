Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\icon-192.png"
if (-not (Test-Path $srcPath)) {
    $srcPath = "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\icon.png"
}

Write-Output "Loading source logo from: $srcPath"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Get-ResizedPngBytes($src, [int]$w, [int]$h) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    $bmp.Dispose()

    return [PSCustomObject]@{
        Width = $w
        Height = $h
        Bytes = $bytes
    }
}

function Save-Png($src, [int]$w, [int]$h, [string]$outPath) {
    $item = Get-ResizedPngBytes $src $w $h
    [System.IO.File]::WriteAllBytes($outPath, $item.Bytes)
    Write-Output "Saved PNG: $outPath ($w x $h)"
}

# 1. Generate individual standard PNG favicons in public/
Save-Png $srcImg 16 16 "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\favicon-16x16.png"
Save-Png $srcImg 32 32 "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\favicon-32x32.png"
Save-Png $srcImg 48 48 "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\favicon-48x48.png"
Save-Png $srcImg 180 180 "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\apple-touch-icon.png"
Save-Png $srcImg 180 180 "c:\Users\pooja\OneDrive\Desktop\BoffIn\public\apple-touch-icon-precomposed.png"

# 2. Build multi-resolution favicon.ico containing 48x48, 32x32, 16x16
$icoItems = @(
    (Get-ResizedPngBytes $srcImg 48 48),
    (Get-ResizedPngBytes $srcImg 32 32),
    (Get-ResizedPngBytes $srcImg 16 16)
)

$ms = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($ms)

$writer.Write([uint16]0)                 # Reserved (0)
$writer.Write([uint16]1)                 # Type 1 = ICO
$writer.Write([uint16]$icoItems.Count)   # Image count

$offset = 6 + ($icoItems.Count * 16)
foreach ($item in $icoItems) {
    $w = if ($item.Width -ge 256) { 0 } else { [byte]$item.Width }
    $h = if ($item.Height -ge 256) { 0 } else { [byte]$item.Height }
    $writer.Write($w)                        # Width
    $writer.Write($h)                        # Height
    $writer.Write([byte]0)                   # Color count
    $writer.Write([byte]0)                   # Reserved
    $writer.Write([uint16]1)                 # Color planes
    $writer.Write([uint16]32)                # Bit count
    $writer.Write([uint32]$item.Bytes.Length)# Image data bytes length
    $writer.Write([uint32]$offset)           # Image data offset
    $offset += $item.Bytes.Length
}

foreach ($item in $icoItems) {
    $writer.Write($item.Bytes)
}

$writer.Flush()
$icoBytes = $ms.ToArray()
$writer.Dispose()
$ms.Dispose()

[System.IO.File]::WriteAllBytes("c:\Users\pooja\OneDrive\Desktop\BoffIn\public\favicon.ico", $icoBytes)
Write-Output "Saved multi-resolution ICO: c:\Users\pooja\OneDrive\Desktop\BoffIn\public\favicon.ico"

# Also copy to root assets
if (Test-Path "c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images") {
    [System.IO.File]::WriteAllBytes("c:\Users\pooja\OneDrive\Desktop\BoffIn\assets\images\favicon.ico", $icoBytes)
}

$srcImg.Dispose()
Write-Output "All favicon files generated successfully!"
