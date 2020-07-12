const crypto = require('crypto');
const fs = require('fs');

function parseCookies(req){
    const str = req.header('Cookie');

    if(typeof str === 'undefined')
        return new Map();

    const pairs = str.split(';');
    const res = new Map();
    pairs.forEach((pair) => {
        const index = pair.indexOf('=');
        const key = pair.substring(0, index);
        const value = pair.substring(index+1);
        res.set(key, value);
    });

    return res;
}

function getId(req, res){
    const cookies = parseCookies(req);

    let statsId = cookies.get('statsId');
    if(typeof statsId === 'undefined'){
        statsId = crypto.randomBytes(32).toString('hex');
    }
    const expiryDate = new Date(Number(new Date()) + 315360000000);
    res.cookie('statsId', statsId, {httpOnly: false, expires: expiryDate});
    return statsId;
}

function updateStats(stats){
    const time = Math.floor(Date.now() / 1000);

    if(stats.clearInterval !== 0){
        if(typeof stats.clearAt === 'undefined'){
            stats.clearAt = Math.floor(time / stats.clearInterval) * stats.clearInterval;
        }

        if(time >= stats.clearAt){
            stats.total = 0;
            stats.unique = 0;
            stats.lastRequests = new Map();
            stats.clearAt += stats.clearInterval;
        }
    }
}
function addToStats(stats, id, options){
    const time = Math.floor(Date.now() / 1000);
    updateStats(stats);

    if(stats.lastRequests.has(id)){
        if(time - stats.lastRequests.get(id) > options.visitTime){
            stats.total++;
        } else {
        }
        stats.lastRequests.set(id, time);
    } else {
        stats.total++;
        stats.unique++;
        stats.lastRequests.set(id, time);
    }
}

function createStats(clearInterval){
    return {
        total: 0,
        unique: 0,
        lastRequests: new Map(),
        clearInterval: clearInterval
    };
}

function getStats(stats){
    return {
        total: stats.total,
        unique: stats.unique
    };
}

function prepareForJSON(stat){
    const clone = Object.assign({}, stat);
    clone.lastRequests = Array.from(clone.lastRequests.entries());
    return clone
}

function statsToJSON(stats){
    return JSON.stringify(
        {
            total: prepareForJSON(stats.total),
            thisMinute: prepareForJSON(stats.thisMinute),
            thisHour: prepareForJSON(stats.thisHour),
            today: prepareForJSON(stats.today),
            thisMonth: prepareForJSON(stats.thisMonth),
            thisYear: prepareForJSON(stats.thisYear)
        }
    )
}

function prepareForUse(stat) {
    stat.lastRequests = new Map(stat.lastRequests);
    return stat;
}

function statsFromJSON(json){
    const stats = JSON.parse(json);
    stats.total = prepareForUse(stats.total);
    stats.thisMinute = prepareForUse(stats.thisMinute);
    stats.thisHour = prepareForUse(stats.thisHour);
    stats.today = prepareForUse(stats.today);
    stats.thisMonth = prepareForUse(stats.thisMonth);
    stats.thisYear = prepareForUse(stats.thisYear);
    return stats;
}

module.exports = (options) => {
    if(typeof options === 'undefined')
        throw 'No options provided.';

    if(typeof options.visitTime === 'undefined')
        throw 'visitTime option is required.';

    let stats = {
        total: createStats(0),
        thisMinute: createStats(60),
        thisHour: createStats(3600),
        today: createStats(86400),
        thisMonth: createStats(2629746),
        thisYear: createStats(31556926)
    };

    if(typeof options.savePath !== 'undefined'){
        if(fs.existsSync(options.savePath)){
            stats = statsFromJSON(fs.readFileSync(options.savePath).toString());
        }

        const saveInterval = options.saveInterval || 60;
        setInterval(() => {
            fs.writeFileSync(
                options.savePath,
                statsToJSON(stats)
            );
        }, saveInterval);
    }

    return (req, res, next) => {
        if(req.path === options.apiPath){
            Object.values(stats).forEach(stats => updateStats(stats));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                total: getStats(stats.total),
                thisMinute: getStats(stats.thisMinute),
                thisHour: getStats(stats.thisHour),
                today: getStats(stats.today),
                thisMonth: getStats(stats.thisMonth),
                thisYear: getStats(stats.thisYear)
            }));
            return;
        }

        const id = getId(req, res);

        Object.values(stats).forEach(stats => {
            addToStats(stats, id, options);
        });
        next();
    };
}