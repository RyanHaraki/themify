#!/bin/bash

# Navigate to the themify directory
cd "$(dirname "$0")"

# Build the package
npm run build

# Create a global link
npm link

echo "Themify has been linked globally. You can now use it with 'npx themify' in your test project."
echo "To test, run: cd test-project && npx themify"
