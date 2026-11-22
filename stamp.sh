#!/bin/sh
# Run before each deploy: gives the shell, the section pages and the atlas assets a fresh ?v=
# so browsers load the new version instead of GitHub Pages' 10-minute cached copy.
cd "$(dirname "$0")" || exit 1
v=$(date -u +%Y%m%d%H%M)
sed -i -E "s/(\?v=)[0-9]+/\1$v/g; s/(<meta name=\"build\" content=\")[0-9]+/\1$v/" dist/index.html dist/atlas/index.html
echo "build $v"
