set -o errexit

rm -rf public
mkdir public

# config
git config --global user.email ""
git config --global user.name ""

# build (CHANGE THIS)
yarn docs

# deploy
cd public
git init
git add .
git commit -m "Deploy to Github Pages"
git push --force --quiet "https://${GITHUB_TOKEN}@$github.com/${GITHUB_REPO}.git" master:gh-pages > /dev/null 2>&1