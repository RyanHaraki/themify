# Themify

> Instantly theme your Next.js + shadcn/ui app with colors extracted from any image

Themify is a powerful CLI tool that transforms your Next.js application's appearance by generating a custom color theme based on any image. Say goodbye to generic-looking shadcn/ui apps and hello to unique, personalized designs in seconds.

![Themify Demo](https://github.com/RyanHaraki/themify/raw/main/demo.gif)

## Features

- **One-Command Theming**: Transform your app's appearance with a single command
- **Image-Based Color Extraction**: Generate themes from any PNG or JPG/JPEG image
- **shadcn/ui Integration**: Perfectly compatible with shadcn/ui component library
- **Smart Color Relationships**: Maintains proper contrast and color harmony
- **Automatic Backups**: Creates backups of your original CSS files
- **Fast & Efficient**: Completes theming in seconds

## Installation

```bash
# Using npx (recommended)
npx themify

# Or install globally
npm install -g themify
```

## Requirements

- Next.js project using shadcn/ui components
- At least one image file (.png, .jpg, or .jpeg) in your `/public` folder
- A `globals.css` file with CSS variables in a `:root` section

## Usage

1. Navigate to your Next.js project directory
2. Make sure you have at least one image in your `/public` folder
3. Run the command:

```bash
npx themify
```

4. Select an image from the list
5. That's it! Your app is now themed based on the selected image

## How It Works

Themify:

1. Scans your `/public` folder for images
2. Extracts dominant colors from your selected image
3. Generates a harmonious color palette
4. Updates your CSS variables in `globals.css`
5. Creates a backup of your original CSS file

## Supported CSS Locations

Themify automatically looks for your `globals.css` file in these locations:

- `./globals.css`
- `./src/app/globals.css`
- `./app/globals.css`
- `./styles/globals.css`

## Why Themify?

Most shadcn/ui applications look identical because they share the same default theme. Themify makes it incredibly easy to give your app a unique identity by generating a custom theme based on any image - your logo, a product photo, or any visual that represents your brand.

## License

MIT

## Authors

[Ryan Haraki](https://twitter.com/ryanharaki_),
[Mukund Mauji](https://x.com/mukundmauji),
[Eshan Betrabet](https://x.com/eshanbetrabet)
