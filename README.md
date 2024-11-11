# gh-dashboard

## About

gh-dashboard is meant to be a dead-simple, client-side summary of your current GitHub work. It provides a convenient view of pull requests, including those you've created and those you're reviewing (more to come).

Any issues, ideas or anything else? gh-dashboard is open source!

## Why

GitHub (both website or cli) allows you to:

 - view your own pull requests (https://github.com/pulls)
 - requests for review (https://github.com/pulls/review-requested)

However, viewing the full set of open pull requests that have been reviewed (whether by user or team) requires a custom filter, additional tab and a couple extra clicks, disrupting the workflow. Discussions - https://github.com/orgs/community/discussions/5289

For users accustomed to Bitbucket or GitLab, which offer more consolidated views of pull requests, gh-dashboard feels familiar.


## Usage

### Recommended

**Do not provide any credentials to unknowm (not verified/reviewed) applications/websites**

1. Clone repository
2. Review code
3. Navigate in browser to the file

### Feeling lucky
- via Github Pages - visit [gh-dashboard](https://atfu-tech.github.io/gh-dashboard/) to get started

## Configuration

To retrieve information from GitHub, this dashboard requires a Personal Access Token (PAT). You can generate one here with read-only permissions for user and repository data.

This dashboard operates entirely on the client side, meaning your GitHub token is stored in your browser's local storage only.

## To Do/Consider

- deployments' review
- build status, comments counter, reactions
- ~~configuration options~~
- ~~show only X items in list (`show more` link)~~
- ~~drop esm.sh (use pure js w/o dependencies)~~

## Disclaimer

This dashboard is provided as-is, without any warranty or support. Code is utterly ugly and available here and/or with Ctrl+U.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
Icon from the Mechanic Elements 9 collection under CC0.
