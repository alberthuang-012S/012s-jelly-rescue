param(
    [string]$Source = (Join-Path $PSScriptRoot 'after-source-generated.png'),
    [string]$Output = (Join-Path $PSScriptRoot '..\..\reference\runtime\jelly-anthropomorphic-player-walk-v2.png')
)

Add-Type -AssemblyName System.Drawing

$cellWidth = 374
$cellHeight = 352
$logicalCellHeight = 362
$columns = 3
$rows = 4
$scale = 0.94
$destinationWidth = [int][Math]::Round($cellWidth * $scale)
$destinationHeight = [int][Math]::Round($logicalCellHeight * $scale)
$groundBaseline = 340
$alphaThreshold = 8

function Get-AlphaBounds {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [int]$X0,
        [int]$Y0,
        [int]$Width,
        [int]$Height,
        [int]$Threshold
    )

    $minX = $Bitmap.Width
    $minY = $Bitmap.Height
    $maxX = -1
    $maxY = -1

    for ($y = $Y0; $y -lt ($Y0 + $Height); $y++) {
        for ($x = $X0; $x -lt ($X0 + $Width); $x++) {
            $alpha = $Bitmap.GetPixel($x, $y).A
            if ($alpha -gt $Threshold) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    [pscustomobject]@{
        MinX = $minX
        MinY = $minY
        MaxX = $maxX
        MaxY = $maxY
    }
}

$sourceBitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$paddedWidth = $cellWidth * $columns
$paddedHeight = $cellHeight * $rows
$paddedBitmap = New-Object System.Drawing.Bitmap($paddedWidth, $paddedHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$padGraphics = [System.Drawing.Graphics]::FromImage($paddedBitmap)
$padGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$padGraphics.Clear([System.Drawing.Color]::Transparent)
$padGraphics.DrawImage($sourceBitmap, 0, 0, $sourceBitmap.Width, $sourceBitmap.Height)
$padGraphics.Dispose()
$sourceBitmap.Dispose()

# Build a working atlas with a slightly taller logical cell. The extra ten
# pixels are only used to reunite the confirmed down-row shoe continuations
# with their own frame before the common scale is applied.
$logicalHeight = $logicalCellHeight * $rows
$logicalBitmap = New-Object System.Drawing.Bitmap($paddedWidth, $logicalHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$logicalGraphics = [System.Drawing.Graphics]::FromImage($logicalBitmap)
$logicalGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$logicalGraphics.Clear([System.Drawing.Color]::Transparent)
for ($row = 0; $row -lt $rows; $row++) {
    for ($column = 0; $column -lt $columns; $column++) {
        $sourceRectangle = New-Object System.Drawing.Rectangle(($column * $cellWidth), ($row * $cellHeight), $cellWidth, $cellHeight)
        $logicalDestination = New-Object System.Drawing.Rectangle(($column * $cellWidth), ($row * $logicalCellHeight), $cellWidth, $cellHeight)
        $logicalGraphics.DrawImage($paddedBitmap, $logicalDestination, $sourceRectangle.X, $sourceRectangle.Y, $sourceRectangle.Width, $sourceRectangle.Height, [System.Drawing.GraphicsUnit]::Pixel)
    }
}

# These six isolated components were verified in the before/after crop review:
# left-row top components are the preceding down-row shoes; right-row bottom
# components are the following up-row caps. The clear rectangles include a
# small antialias margin, while staying outside each frame's real character.
$verifiedNeighborArtifacts = @(
    [pscustomobject]@{ row = 1; column = 0; x = 192; y = 0; width = 43; height = 10; reason = 'previous down-row shoe fragment' }
    [pscustomobject]@{ row = 1; column = 1; x = 167; y = 0; width = 38; height = 10; reason = 'previous down-row shoe fragment' }
    [pscustomobject]@{ row = 1; column = 2; x = 141; y = 0; width = 45; height = 10; reason = 'previous down-row shoe fragment' }
    [pscustomobject]@{ row = 1; column = 0; x = 213; y = 345; width = 33; height = 7; reason = 'following right-row cap fragment' }
    [pscustomobject]@{ row = 1; column = 1; x = 184; y = 348; width = 23; height = 4; reason = 'following right-row cap fragment' }
    [pscustomobject]@{ row = 2; column = 0; x = 176; y = 333; width = 62; height = 19; reason = 'following up-row cap fragment' }
    [pscustomobject]@{ row = 2; column = 1; x = 153; y = 335; width = 58; height = 17; reason = 'following up-row cap fragment' }
    [pscustomobject]@{ row = 2; column = 2; x = 131; y = 332; width = 64; height = 20; reason = 'following up-row cap fragment' }
)
$downOverflowArtifacts = $verifiedNeighborArtifacts | Where-Object { $_.row -eq 1 -and $_.y -eq 0 }
foreach ($artifact in $downOverflowArtifacts) {
    $sourceX = ($artifact.column * $cellWidth) + $artifact.x
    $sourceY = ($artifact.row * $cellHeight) + $artifact.y
    $destinationX = ($artifact.column * $cellWidth) + $artifact.x
    $destinationY = (0 * $logicalCellHeight) + $cellHeight + $artifact.y
    $overflowSourceRectangle = New-Object System.Drawing.Rectangle($sourceX, $sourceY, $artifact.width, $artifact.height)
    $overflowDestinationRectangle = New-Object System.Drawing.Rectangle($destinationX, $destinationY, $artifact.width, $artifact.height)
    $logicalGraphics.DrawImage($paddedBitmap, $overflowDestinationRectangle, $overflowSourceRectangle.X, $overflowSourceRectangle.Y, $overflowSourceRectangle.Width, $overflowSourceRectangle.Height, [System.Drawing.GraphicsUnit]::Pixel)
    Write-Output ("reunited row=0 column={0} source={1},{2},{3},{4} as complete shoe" -f `
        $artifact.column, $sourceX, $sourceY, $artifact.width, $artifact.height)
}
$logicalGraphics.Dispose()

$cleanGraphics = [System.Drawing.Graphics]::FromImage($logicalBitmap)
$cleanGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$transparentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
foreach ($artifact in $verifiedNeighborArtifacts) {
    $artifactRectangle = New-Object System.Drawing.Rectangle(
        (($artifact.column * $cellWidth) + $artifact.x),
        (($artifact.row * $logicalCellHeight) + $artifact.y),
        $artifact.width,
        $artifact.height
    )
    $cleanGraphics.FillRectangle($transparentBrush, $artifactRectangle)
    Write-Output ("cleared row={0} column={1} source={2},{3},{4},{5} reason={6}" -f `
        $artifact.row, $artifact.column, $artifact.x, $artifact.y, $artifact.width, $artifact.height, $artifact.reason)
}
$transparentBrush.Dispose()
$cleanGraphics.Dispose()

$outputPath = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = Split-Path -Parent $outputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$outputBitmap = New-Object System.Drawing.Bitmap($paddedWidth, $paddedHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($outputBitmap)
$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

for ($row = 0; $row -lt $rows; $row++) {
    for ($column = 0; $column -lt $columns; $column++) {
        $sourceX = $column * $cellWidth
        $sourceY = $row * $logicalCellHeight
        # Clone each source rectangle into an isolated transparent bitmap before
        # bicubic scaling, so the resampler cannot sample a neighboring frame.
        $sourceRectangle = New-Object System.Drawing.Rectangle($sourceX, $sourceY, $cellWidth, $logicalCellHeight)
        $frameBitmap = $logicalBitmap.Clone($sourceRectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $bounds = Get-AlphaBounds -Bitmap $frameBitmap -X0 0 -Y0 0 -Width $cellWidth -Height $logicalCellHeight -Threshold $alphaThreshold
        if ($bounds.MaxX -lt 0) {
            throw "Frame $row,$column is empty."
        }

        # Scale every complete source cell by the same factor. Keep its original
        # x relationship, and place its actual alpha bottom on one shared ground.
        $destinationX = ($column * $cellWidth) + [int][Math]::Round(($cellWidth - $destinationWidth) / 2)
        $contentBottom = $bounds.MaxY + 1
        $scaledContentBottom = [int][Math]::Round($contentBottom * $destinationHeight / $logicalCellHeight)
        $destinationY = ($row * $cellHeight) + $groundBaseline - $scaledContentBottom
        $destinationRectangle = New-Object System.Drawing.Rectangle($destinationX, $destinationY, $destinationWidth, $destinationHeight)
        $graphics.DrawImage(
            $frameBitmap,
            $destinationRectangle,
            0,
            0,
            $cellWidth,
            $logicalCellHeight,
            [System.Drawing.GraphicsUnit]::Pixel
        )
        $frameBitmap.Dispose()

        Write-Output ("row={0} column={1} source={2},{3},{4},{5} destination={6},{7},{8},{9}" -f `
            $row, $column, $sourceX, $sourceY, $cellWidth, $cellHeight,
            $destinationX, $destinationY, $destinationWidth, $destinationHeight)
    }
}

$graphics.Dispose()

# Bicubic resampling can leave alpha=1 antialias pixels on an atlas cell's
# outermost border. Every output frame was checked before this step: the
# nearest real character pixel is at least 11px inside the cell, so clearing
# only this verified transparent safety ring cannot remove a shoe, hair,
# headwear, ribbon, drop, or any other owned detail. It does prevent a
# renderer from sampling a faint edge pixel at another camera scale.
$transparentBorderColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
for ($row = 0; $row -lt $rows; $row++) {
    for ($column = 0; $column -lt $columns; $column++) {
        $x0 = $column * $cellWidth
        $y0 = $row * $cellHeight
        for ($x = 0; $x -lt $cellWidth; $x++) {
            $outputBitmap.SetPixel($x0 + $x, $y0, $transparentBorderColor)
            $outputBitmap.SetPixel($x0 + $x, $y0 + $cellHeight - 1, $transparentBorderColor)
        }
        for ($y = 1; $y -lt ($cellHeight - 1); $y++) {
            $outputBitmap.SetPixel($x0, $y0 + $y, $transparentBorderColor)
            $outputBitmap.SetPixel($x0 + $cellWidth - 1, $y0 + $y, $transparentBorderColor)
        }
    }
}
$transparentBorderColor = $null

$outputBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$outputBitmap.Dispose()
$paddedBitmap.Dispose()
$logicalBitmap.Dispose()

Write-Output ("wrote {0}x{1} to {2}" -f $paddedWidth, $paddedHeight, $Output)
