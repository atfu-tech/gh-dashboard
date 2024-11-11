# Changelog

All changes must be documented in this file along with PR.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

Versioning  X.Y.Z:
 X - breaking changes
 Y - non breaking features, notable bugfixes
 Z - bugfixes, small improvments

## [1.3.0] - 2024-11-11
### Changed
- full mode: show PRs reviewed by your team members
- configuration: all options
- cache: cache only required properties - capacity improvement
- panels (draggable)
- nav

## [1.2.0] - 2024-11-08
### Changed
- get rid of ejs templates - no-external-deps
- split - open pr to review and reviewed
### Added
- feature: by default show 5 items on each list and show all as a option

## [1.1.0] - 2024-11-06
### Changed
- replace octokit with plain fetch (speed improvement)
### Added
- feature: 1minute localstorage-based cache
- feature: marker/badge - "reviewed"
- feature: show open and reviewed PRs in the same list

## [1.0.0] - 2024-11-05
### Added
- feature: section "Pull requests to review"
- feature: section "My Pull requests"
