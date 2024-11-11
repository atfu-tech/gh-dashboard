let Config = {
    MODE_SIMPLE: 'simple',
    MODE_FULL: 'full',
    _defaults: {
        mode: '',
        limitEntries: 4,
        github: {
            token: '',
            org: '',
            user: '',
            repoFilters: '',
            cacheTTLSeconds: 60,
            apiVersion: '2022-11-28',
            apiUrl: 'https://api.github.com/search/issues',
            pageSize: 100,
        }
    },
}

Config.load = function() {
    let cfg = {...Config._defaults};
    let fromLocalStorage = localStorage.getItem('config');
    if (fromLocalStorage) {
        cfg = {...JSON.parse(fromLocalStorage)};
    }
    for (let key in cfg) {
        Config[key] = cfg[key];
    }
}

Config.modify = function(group, key, value) {
    if (group) {
        Config[group][key] = value;
    } else {
        Config[key] = value;
    }
    let oldValue = localStorage.getItem('config');
    if (oldValue) {
        let oldConfig = JSON.parse(oldValue);
        if (group) {
            oldConfig[group][key] = value;
        } else {
            oldConfig[key] = value;
        }
        localStorage.setItem('config', JSON.stringify(oldConfig));
    }
}

Config.save = function() {
    let newConfig = {...Config};
    if (document.getElementById('mode-simple').checked) {
        newConfig.mode = Config.MODE_SIMPLE;
    } else {
        newConfig.mode = Config.MODE_FULL;
    }
    newConfig.limitEntries = parseInt(document.getElementById('limit-entries').value);
    newConfig.github.repoFilters = document.getElementById('github-repo-filters').value;
    newConfig.github.cacheTTLSeconds = parseInt(document.getElementById('github-cache-ttl').value);
    newConfig.github.pageSize = parseInt(document.getElementById('github-page-size').value);
    newConfig.github.apiVersion = document.getElementById('github-api-version').value;
    newConfig.github.apiUrl = document.getElementById('github-api-url').value;
    newConfig.github.org = document.getElementById('github-org').value;
    newConfig.github.user = document.getElementById('github-user').value;
    newConfig.github.token = document.getElementById('github-token').value;
    localStorage.setItem('config', JSON.stringify(newConfig));
}

Config.show = function() {
    document.getElementById('config').style.display = 'flex';
    document.getElementById('loader').style.display = 'none';
    document.getElementById('grid-container').style.display = 'none';

    document.getElementById('github-token').value = Config.github.token;
    document.getElementById('github-api-url').value = Config.github.apiUrl;
    document.getElementById('github-api-version').value = Config.github.apiVersion;
    document.getElementById('github-cache-ttl').value = Config.github.cacheTTLSeconds;
    document.getElementById('github-page-size').value = Config.github.pageSize;
    document.getElementById('github-org').value = Config.github.org;
    document.getElementById('github-user').value = Config.github.user;
    document.getElementById('github-repo-filters').value = Config.github.repoFilters;
    if (Config.mode == Config.MODE_SIMPLE) {
        document.getElementById('mode-simple').checked = true;
    } else {
        document.getElementById('mode-full').checked = true;
    }
    document.getElementById('limit-entries').value = Config.limitEntries;
    document.getElementById('save-config').onclick = Config.save;
    document.getElementById('cancel-config').onclick = window.location.reload;
}


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

async function _getPullRequests(query) {
    let cached = readFromCache(query);
    if (cached) {
        return cached;
    }
    let items = [];
    let page = 1;
    let total = null;
    while (true) {
        const data = await requestGithub(query, page);
        for (let pr of data.items) {
            pr.repository_url = pr.repository_url.split('/').slice(-2).join('/');
            pr.org = pr.repository_url.split('/')[0];
            pr.repo_name = pr.repository_url.split('/')[1];
            pr.updated_ago = timeSince(new Date(pr.updated_at));
        }
        if (!total) {
            total = data.total_count;
        }
        if (!data.items || data.items.length == 0) {
            break;
        }
        items.push(...data.items);
        if (total == items.length) {
            break;
        }
        page++;
        if (page > 10) {
            break;
        }
    }
    let cleanedItems = [];
    for (let pr of items) {
        pr = {
            repository_url: pr.repository_url,
            org: pr.org,
            repo_name: pr.repo_name,
            updated_ago: pr.updated_ago,
            title: pr.title,
            url: pr.url,
            html_url: pr.html_url,
            number: pr.number,
            updated_at: pr.updated_at,
            user_name: pr.user.login,
            user_url: pr.user?.url,
            user_avatar: pr.user?.avatar_url
        };
        cleanedItems.push(pr);
    }
    writeToCache(query, cleanedItems);
    return cleanedItems;
}

async function getAllPullRequests(org) {
    const items = await _getPullRequests(`is:pr state:open org:${org}`);
    return items;
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
        if (new Date() - new Date(entry.timestamp) < Config.github.cacheTTLSeconds* 1000) {
            return entry.data;
        }
    }
    return null;
}

async function requestGithub(query, page = 1) {
    const response = await fetch(Config.github.apiUrl + '?q=' + encodeURIComponent(query) + `&page=${page}&per_page=${Config.github.pageSize}`, {
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + Config.github.token,
            'X-GitHub-Api-Version': Config.github.apiVersion
        }
    });
    const data = await response.json();
    return data;
}

async function getDataSimple(org){
    let [toReviewPrs, reviewedPrs, myPrs] = await Promise.all([
        getPullRequestsToReview(),
        getPullRequestsAlreadyReviewed(),
        getMyPullRequests()
    ]);
    let toReviewPrsCleaned = []
    let reviewedPrsCleaned = []
    for (let pr of toReviewPrs) {
        if (reviewedPrs.find(p => p.url === pr.url)) {
            reviewedPrsCleaned.push(pr)
        } else {
            toReviewPrsCleaned.push(pr)
        }
    }
    return [myPrs,toReviewPrsCleaned, reviewedPrsCleaned]
}
async function getDataFull(org, username, repoFilters){
    let [allPrs, simpleData] = await Promise.all([getAllPullRequests(org), getDataSimple(org)]);
    let filteredPrs = allPrs.filter(function (pr) {
        for (let repoFilter of repoFilters) {
            let regex = new RegExp(repoFilter.replace(/\*/g, '.*'));
            if (pr.repository_url.match(regex)) {
                return true;
            }
        }
        return false;
    });
    let [myPrs, toReviewPrs, reviewedPrs] = simpleData;

    let possiblyToReviewPrs = filteredPrs.filter(function (pr) {
        return !myPrs.find(p => p.url === pr.url) && !reviewedPrs.find(p => p.url === pr.url) && !toReviewPrs.find(p => p.url === pr.url);
    });

    return [myPrs, toReviewPrs, reviewedPrs, possiblyToReviewPrs]
}



async function main() {
    Config.load();
    navSetup();
    if (!Config.github.token) {
        Config.show();
        return;
    }
    try {
        let [myPrs, toReviewPrs, reviewedPrs, possiblyToReviewPrs] = [[],[],[],[]];
        if (Config.mode == Config.MODE_SIMPLE) {
            [myPrs, toReviewPrs, reviewedPrs] = await getDataSimple()
        } else {
            [myPrs, toReviewPrs, reviewedPrs, possiblyToReviewPrs] = await getDataFull(Config.github.org, Config.github.user, Config.github.repoFilters)
        }
        let myPrsEntries = [];
        let prsToReviewEntries = [];
        let prsReviewedEntries = [];
        let possiblyToReviewPrsEntries = [];
        for (let pr of myPrs) {
            myPrsEntries.push(renderTemplate('entry', pr));
        }
        for (let pr of toReviewPrs) {
            prsToReviewEntries.push(renderTemplate('entry', pr));
        }
        for (let pr of reviewedPrs) {
            prsReviewedEntries.push(renderTemplate('entry', pr));
        }
        for (let pr of possiblyToReviewPrs) {
            possiblyToReviewPrsEntries.push(renderTemplate('entry', pr));
        }
        let noEntries = renderTemplate('no-entries', {});
        let html = renderTemplate('main', {
            review: { 
                count: prsToReviewEntries.length, 
                entries: prsToReviewEntries.join('') || noEntries,
                showAll: prsToReviewEntries.length > Config.limitEntries ? renderTemplate('show-all', { section: 'prsToReview' }) : ''
            },
            reviewed: { 
                count: prsReviewedEntries.length, 
                entries: prsReviewedEntries.join('') || noEntries,
                showAll: prsReviewedEntries.length > Config.limitEntries ? renderTemplate('show-all', { section: 'prsReviewed' }) : ''
            },
            my: { 
                count: myPrsEntries.length, 
                entries: myPrsEntries.join('') || noEntries,
                showAll: myPrsEntries.length > Config.limitEntries ? renderTemplate('show-all', { section: 'myPrs' }) : ''
            },
            possiblyToReview: { 
                count: possiblyToReviewPrsEntries.length, 
                entries: possiblyToReviewPrsEntries.join('') || (Config.mode == Config.MODE_SIMPLE ? renderTemplate('no-entries', { message: 'Available only in full mode.' }) : noEntries),
                showAll: possiblyToReviewPrsEntries.length > Config.limitEntries ? renderTemplate('show-all', { section: 'prsPossiblyToReview' }) : ''
            }
        });
        let tempContent = document.getElementById('temp');
        const observer = new MutationObserver(() => {
            const child = document.getElementById('myPrs');
            if (child) {
                loadGridState();
                observer.disconnect(); // Stop observing once done
            }
        });

        observer.observe(tempContent, { childList: true });
        tempContent.innerHTML = html;
    } catch (error) {
        Config.show();
        document.getElementById('error').innerHTML = error.toString();
        document.getElementById('error').style.display = 'block';
    }
}

function navSetup() {
    document.getElementById('btn-config').onclick = Config.show;
    document.getElementById('btn-logout').onclick = function() {
        Config.modify('github', 'token', '');
        window.location.reload();
    }
}

function renderTemplate(template, data) {
    let tpl = document.getElementById(`template-${template}`).innerHTML;
    return new Function("data", "return `" + tpl + "`;")(data);
}
function showAllEntries(el) {
    document.getElementById(el).querySelectorAll('li').forEach(li => li.style.display = 'flex');
    document.getElementById(el).querySelector('.show-all').style.display = 'none';
}

// Allow drop on grid cells
function allowDrop(event) {
    event.preventDefault();
}

// Store the ID of the dragged section
function drag(event) {
    event.dataTransfer.setData("text", event.target.id);
}

// Drop section into a new cell and save state
function drop(event) {
    event.preventDefault();
    const sectionId = event.dataTransfer.getData("text");
    const section = document.getElementById(sectionId);

    let target = event.target;
    if (!target.classList.contains('grid-item')) {
        target = target.closest('.grid-item');
    }

    if (!target.querySelector("section")) {
        target.appendChild(section);
    } else {
        let oldSection = target.querySelector("section");
        let oldParent = section.closest('.grid-item');
        oldParent.appendChild(oldSection);
        target.appendChild(section);
    }
    saveGridState();
}

// Save the current state of the grid to localStorage
function saveGridState() {
    const gridState = {};

    // Loop through each grid item (cell) and store the section inside
    document.querySelectorAll(".grid-item").forEach(cell => {
        const section = cell.querySelector("section");
        if (section) {
            gridState[cell.id] = section.id;
        }
    });

    localStorage.setItem("gridState", JSON.stringify(gridState));
}

// Load the grid state from localStorage on page load
function loadGridState() {
    const savedState = localStorage.getItem("gridState");
    let gridState;
    if (savedState) {
        gridState = JSON.parse(savedState);
    } else {
        gridState = {"cell1": "myPrs", "cell2": "prsToReview", "cell3": "prsReviewed", "cell4": "prsPossiblyToReview"};
    }
    document.getElementById('grid-container').style.display = 'grid';
    document.getElementById('temp').style.display = 'none';
    document.getElementById('loader').style.display = 'none';

        // Clear each cell and place sections based on saved state
        for (const cellId in gridState) {
        const cell = document.getElementById(cellId);
        if (gridState[cellId]) {
            const section = document.getElementById(gridState[cellId]);
            if (cell && section) {
                cell.appendChild(section);
                }
            }
        }
}

document.addEventListener('DOMContentLoaded', () => {
    main();
});