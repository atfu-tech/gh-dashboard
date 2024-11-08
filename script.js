const CACHE_VALIDITY_SECONDS = 60;
const SHOW_ALL_LIMIT = 5;
const GITHUB_SEARCH_ISSUES_API_URL = 'https://api.github.com/search/issues';

function timeSince(date) {
    let seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}
async function getPullRequestsToReview() {
    const items = await _getPullRequests(`is:pr state:open review-requested:@me`);
    return items;
}
async function getPullRequestsAlreadyReviewed() {
    const items = await _getPullRequests(`is:pr state:open reviewed-by:@me`);
    for (let pr of items) {
        pr.reviewed = true;
    }
    return items;
}
async function getMyPullRequests() {
    const items = await _getPullRequests(`is:pr state:open author:@me`);
    return items;
}
function writeToCache(key, data) {
    try {
        localStorage.setItem('cache-' + key, JSON.stringify({ data: data, timestamp: new Date() }));
    } catch (error) {
        console.error('Error writing to cache:', error);
    }
}
function readFromCache(key) {
    let raw = localStorage.getItem('cache-' + key);
    if (raw) {
        let entry = JSON.parse(raw);
        if (new Date() - new Date(entry.timestamp) < CACHE_VALIDITY_SECONDS * 1000) {
            return entry.data;
        }
    }
    return null;
}
async function requestGithub(query) {
    let cached = readFromCache(query);
    if (cached) {
        return cached;
    }
    const response = await fetch(GITHUB_SEARCH_ISSUES_API_URL + '?q=' + encodeURIComponent(query), {
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + localStorage.getItem('GITHUB_TOKEN'),
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    const data = await response.json();
    writeToCache(query, data);
    return data;
}
async function _getPullRequests(query) {
    const data = await requestGithub(query);
    for (let pr of data.items) {
        pr.repository_url = pr.repository_url.split('/').slice(-2).join('/');
        pr.org = pr.repository_url.split('/')[0];
        pr.repo_name = pr.repository_url.split('/')[1];
        pr.updated_ago = timeSince(new Date(pr.updated_at));
    }
    return data.items;
}
async function main() {
    let token = localStorage.getItem('GITHUB_TOKEN');
    if (!token) {
        document.getElementById('setup').style.display = 'flex';
        document.getElementById('loader').style.display = 'none';
        document.getElementById('logout').style.display = 'none';
        return;
    }
    try {
        let [prsToReview, prsReviewed, myPrs] = await Promise.all([
            getPullRequestsToReview(),
            getPullRequestsAlreadyReviewed(),
            getMyPullRequests()
        ]);
        let prsReview = [];
        for (let pr of prsToReview) {
            prsReview.push(pr);
        }
        for (let pr of prsReviewed) {
            if (prsReview.find(p => p.url === pr.url)) {
                continue;
            }
            prsReview.push(pr);
        }
        let myPrsEntries = [];
        let prsReviewEntries = [];
        let prsReviewedEntries = [];
        for (let pr of myPrs) {
            myPrsEntries.push(renderTemplate('entry', pr));
        }
        for (let pr of prsReview) {
            if (pr.reviewed) {
                prsReviewedEntries.push(renderTemplate('entry', pr));
            } else {
                prsReviewEntries.push(renderTemplate('entry', pr));
            }
        }
        let noEntries = renderTemplate('no-entries', {});
        let html = renderTemplate('main', {
            review: { 
                count: prsReviewEntries.length, 
                entries: prsReviewEntries.join('') || noEntries,
                showAll: prsReviewEntries.length > SHOW_ALL_LIMIT ? renderTemplate('show-all', {}) : ''
            },
            reviewed: { 
                count: prsReviewedEntries.length, 
                entries: prsReviewedEntries.join('') || noEntries,
                showAll: prsReviewedEntries.length > SHOW_ALL_LIMIT ? renderTemplate('show-all', {}) : ''
            },
            my: { 
                count: myPrsEntries.length, 
                entries: myPrsEntries.join('') || noEntries,
                showAll: myPrsEntries.length > SHOW_ALL_LIMIT ? renderTemplate('show-all', {}) : ''
            }
        });
        document.getElementById('content').innerHTML = html;
    } catch (error) {
        document.getElementById('setup').style.display = 'flex';
        document.getElementById('logout').style.display = 'none';
        document.getElementById('loader').style.display = 'none';
        document.getElementById('error').innerHTML = error.toString();
        document.getElementById('error').style.display = 'block';
    }
}

function saveToken() {
    localStorage.setItem('GITHUB_TOKEN', document.getElementById('github-token').value);
    window.location.reload();
}
function clearToken() {
    localStorage.removeItem('GITHUB_TOKEN');
    window.location.reload();
}
function renderTemplate(template, data) {
    let tpl = document.getElementById(`template-${template}`).innerHTML;
    return new Function("data", "return `" + tpl + "`;")(data);
}
function showAllEntries(el) {
    document.getElementById(el).querySelectorAll('li').forEach(li => li.style.display = 'flex');
    document.getElementById(el).querySelector('.show-all').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    main();
});