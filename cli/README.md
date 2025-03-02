# Themify

A CLI tool to theme Next.js websites using colors extracted from images.

## Description

Themify is a simple CLI tool that helps you theme your Next.js website using colors extracted from images in your project's public folder. It uses [extract-colors](https://www.npmjs.com/package/extract-colors) to extract colors from images and updates your `globals.css` file with the new theme colors.

## Requirements

- Next.js project with shadcn components
- Node.js >= 14

## Installation

```bash
npm install -g themify
```

## Usage

Navigate to your Next.js project directory and run:

```bash
npx themify
```

The tool will:
1. Look for images in your public folder
2. Ask you to select an image to base your theme on
3. Extract colors from the selected image
4. Update your globals.css file with the new theme colors

## License

MIT
