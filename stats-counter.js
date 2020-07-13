const fs = require('fs');

function parseCookies(req){
    const str = req.header('Cookie');

    if(typeof str === 'undefined')
        return new Map();

    const pairs = str.replace(/ /g, '').split(';');
    const res = new Map();

    pairs.forEach((pair) => {
        const index = pair.indexOf('=');
        const key = pair.substring(0, index);
        const value = pair.substring(index+1);
        res.set(key, value);
    });
    
    return res;
}

function getLastRequest(req, res){
    const time = Math.floor(Date.now() / 1000);
    const cookies = parseCookies(req);

    let lastRequest = parseInt(cookies.get('stats-lastRequest'),10);
    if(isNaN(lastRequest)){
        lastRequest = null;
    }
    const expiryDate = new Date(Number(new Date()) + 315360000000);
    res.cookie('stats-lastRequest', time, {sameSite: 'strict', httpOnly: true, expires: expiryDate});
    return lastRequest;
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
            stats.clearAt += stats.clearInterval;
        }
    }
}
function addToStats(stats, lastRequest, options){
    const time = Math.floor(Date.now() / 1000);
    updateStats(stats);

    if(lastRequest !== null && lastRequest < stats.clearAt - stats.clearInterval){
        if(options.debugLog) console.log('  Interval end. Reset.');
        lastRequest = null;
    }

    if(lastRequest !== null){
        if(time - lastRequest > options.visitTime){
            if(options.debugLog) console.log('  Visit');
            stats.total++;
        }
    } else {
        if(options.debugLog) console.log('  Unique visit');
        stats.total++;
        stats.unique++;
    }
}

function createStats(clearInterval){
    return {
        total: 0,
        unique: 0,
        clearInterval: clearInterval
    };
}

function getStats(stats){
    return {
        total: stats.total,
        unique: stats.unique
    };
}


function statsToJSON(stats){
    return JSON.stringify(stats);
}

function statsFromJSON(json){
    return JSON.parse(json);
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
        }, saveInterval*1000);
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
            })
            );
            return;
        }

        const lastRequest = getLastRequest(req, res);

        if(options.debugLog){
            console.log(req.path + ': lastReq = ' + lastRequest);
        }
        Object.values(stats).forEach((stat, i) => {
            if(options.debugLog) console.log(Object.keys(stats)[i]);
            addToStats(stat, lastRequest, options);
        });
        next();
    };
}