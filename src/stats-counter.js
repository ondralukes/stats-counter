const crypto = require('crypto');

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
        res.cookie('statsId', statsId, {httpOnly: false, expire: 2147483647});
    }
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

module.exports = (options) => {
    if(typeof options === 'undefined')
        throw 'No options provided.';

    if(typeof options.visitTime === 'undefined')
        throw 'visitTime option is required.';

    const total = createStats(0);
    const thisMinute = createStats(60);
    const thisHour = createStats(3600);
    const today = createStats(86400);
    const thisMonth = createStats(2629746);
    const thisYear = createStats(31556926);

    const allStats = [
        total,
        thisMinute,
        thisHour,
        today,
        thisMonth,
        thisYear
    ];

    return (req, res, next) => {
        if(req.path === options.apiPath){
            allStats.forEach(stats => updateStats(stats));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                total: getStats(total),
                thisMinute: getStats(thisMinute),
                thisHour: getStats(thisHour),
                today: getStats(today),
                thisMonth: getStats(thisMonth),
                thisYear: getStats(thisYear)
            }));
            return;
        }

        const id = getId(req, res);

        allStats.forEach(stats => {
            addToStats(stats, id, options);
        })
        next();
    };
}