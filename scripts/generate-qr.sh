#!/bin/bash

# QR Code Generator for DramaRama
# Usage: ./generate-qr.sh https://your-production-url.com

URL="${1:-https://your-app.vercel.app}"

echo "Generating QR code for: $URL"

# Check if qrencode is installed
if command -v qrencode &> /dev/null; then
    # Generate PNG
    qrencode -o qr-code.png -s 10 -m 2 "$URL"
    echo "✅ Generated qr-code.png"
    
    # Generate SVG
    qrencode -o qr-code.svg -t SVG "$URL"
    echo "✅ Generated qr-code.svg"
    
    echo ""
    echo "Files created in current directory:"
    ls -la qr-code.*
else
    echo "⚠️  qrencode not installed."
    echo ""
    echo "Install with: brew install qrencode"
    echo ""
    echo "Or use these free online tools:"
    echo "  • https://www.qr-code-generator.com/"
    echo "  • https://www.the-qrcode-generator.com/"
    echo "  • https://goqr.me/"
    echo ""
    echo "Just paste your URL: $URL"
fi
