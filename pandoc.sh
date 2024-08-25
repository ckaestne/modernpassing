#!/bin/bash

input_files="introduction.md 4a-4hsw-notation.md 4b-4hsw-beginner.md 4c-4hsw-doubles.md 4d-4hsw-heffs.md"

output_file="modernpassing.pdf"

working_dir="pandoc"

mkdir -p $working_dir/img

cd vizsiteswap
npm install
npm run build
cd ..

for file in $input_files; do 
    node vizsiteswap/dist/index.js preprocess -i $file -o $working_dir/$file -d $working_dir/img  --type latex --includeDir img
done

cd $working_dir
pandoc $input_files --metadata-file "../pandoc.json" -o "../$output_file"
cd ..
