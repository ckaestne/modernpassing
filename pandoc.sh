#!/bin/bash

#input_files="introduction.md 1-learn-teach.md 2a-intro-notation.md 2b-basic-sync.md 2c-jims.md 2d-advanced.md 2e-tedious.md 2f-improve.md 3-minis.md 4a-4hsw-notation.md 4b-4hsw-beginner.md 4c-4hsw-doubles.md 4d-4hsw-heffs.md 4e-4hsw-zaps.md 4f-4hsw-trelfs.md 4g-4hsw-named.md 4h-4hsw-compatible.md 4i-4hsw-holygrail.md 4k-4hsw-improve.md 4l-4hsw-theory.md 5a-intro.md 5b-feeds.md 5c-static-groups.md 5d-moving.md 5e-large-patterns.md 6a-intro.md 6b-notation.md 6c-roundabout.md 6d-roundabout-variations.md 6e-extra-club.md 6e-northwall.md 6f-aidan-patterns.md 6g-ambled-patterns.md 6h-zippy-etc.md 6i-beyond-basics.md 6j-siteswap-takeouts.md 7-appendix-8c1c.md 7-appendix-siteswaplist.md"
input_files="introduction.md 1-learn-teach.md 2a-intro-notation.md 2b-basic-sync.md 2c-jims.md 2d-advanced.md 2e-tedious.md 2f-improve.md 4a-4hsw-notation.md 4b-4hsw-beginner.md 4c-4hsw-doubles.md 4d-4hsw-heffs.md 4e-4hsw-zaps.md 4f-4hsw-trelfs.md 4g-4hsw-named.md 4h-4hsw-compatible.md 4i-4hsw-holygrail.md 4k-4hsw-improve.md 4l-4hsw-theory.md 7-appendix-8c1c.md 7-appendix-siteswaplist.md"

output_file="modernpassing.pdf"

working_dir="pandoc"

rm -rf $working_dir
mkdir -p $working_dir/img
cp -r src/* $working_dir

cd vizsiteswap
npm install
npm run build
cd ..


for file in $input_files; do 
    echo preparing $file
    node vizsiteswap/dist/index.js preprocess -i src/$file -o $working_dir/$file -d $working_dir/img --type latex --includeDir img
done

cd compatsiteswaps
npm install; npm run build
node dist/latex.js -i ../$working_dir/7-appendix-siteswaplist.md -o ../$working_dir/7-appendix-siteswaplist.md
cd ..


cd $working_dir
pandoc $input_files --metadata-file "../pandoc.json" --pdf-engine=xelatex -o "../$output_file"
cd ..




