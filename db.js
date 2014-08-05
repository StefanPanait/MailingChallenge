var sqlite3 = require('sqlite3').verbose(),
    domains = require('./data/domains'),
    db,
    database = {};

database.init = function() {
    db = new sqlite3.Database('chain.sqlite3', function() {
        database.createTables();
    });
    database.dayCount = 0;
}

database.createTables = function() {
    database.createMailingTable();
}

database.createMailingTable = function() {
    db.run("DROP TABLE IF EXISTS mailing;", function(err) {
        db.run("CREATE TABLE mailing \
            (addr TEXT);", function(err) {
            if (err) console.log(err);
            database.createDomainsTable();
        });
    });
}

database.createDomainsTable = function() {
    db.run("DROP TABLE IF EXISTS domains;", function(err) {
        db.run("CREATE TABLE domains \
            (domain_name TEXT, \
            date_entered TEXT);",
            function(err) {
                if (err) console.log(err);
                database.passTime(null, 30); //init db with 40 days of history
            });
    });
}

database.passTime = function(cb, daysToComplete) {
    console.log("starting passTime days to complete is :" + daysToComplete);
    var newEmail = "",
        numberOfEntries = 3; // select the number of entries for this day (50-100)


    var stmt = db.prepare("INSERT INTO mailing VALUES (?)");

    database.incrementDayCount();
    for (var i = 0; i < numberOfEntries; i++) {
        var domainIndex = Math.floor((Math.random() * domains.length)); //random number between 0 and 150 to choose a domain
        newEmail = "-@" + domains[domainIndex];
        stmt.run(newEmail);
    }

    stmt.finalize(function() {
        if (!daysToComplete) daysToComplete = 1;
        daysToComplete = daysToComplete - 1;
        console.log("pass time days to complete is :" + daysToComplete);
        if (daysToComplete !== 0) {
            database.updateDomainsTable(database.passTime, daysToComplete, cb); //need to update domains every single day
        } else {
            database.updateDomainsTable(null, null, cb);
        }
    });
};

database.countMailingtable = function(cb) {
    db.all("SELECT COUNT(*) FROM mailing", function(err, rows) {
        var count = rows[0]['COUNT(*)'];
        cb(err, count);
    });
}

database.updateDomainsTable = function(loop, daysToComplete, cb) {
    console.log("updateDomainsTable days to complete is :" + daysToComplete);
    var numberOfOldEntries;
    var domainName,
        dateEntered = database.getDayCount();

    db.all("SELECT domain_name AS domain_name FROM domains", function(err, rows) {
        numberOfOldEntries = rows.length; // we have processed a total of this many entries

        console.log("the day is: " + dateEntered);

        db.all("SELECT addr AS addr FROM mailing", function(err, rows) {
            var stmt = db.prepare("INSERT INTO domains VALUES (?,?)");
            for (var i = numberOfOldEntries; i < rows.length; i++) {
                domainName = rows[i].addr.split('@')[1];
                stmt.run(domainName, dateEntered);
            }
            stmt.finalize(function() {
                console.log("completed day: " + database.getDayCount());
                if (loop) { //are we done passing days?
                    console.log("sending days to complete is :" + daysToComplete);
                    loop(cb, daysToComplete); //no: loop pass time
                } else { //we are done looping days
                    console.log("running cb if there is one");
                    if (cb) { //do we have a cb?

                        cb(); //run it
                    }
                }
            });
        });
    });
}

database.updateReport = function(cb) {
    var domainsObj = {},
        sortedDomainsList = [],
        rowsLength,
        domainName,
        minDate = database.getDayCount() - 30; // we only want records after this date


    //for testing purposes
    if (database.getDayCount() < 30) {
        minDate = database.getDayCount() / 2;
    }

    db.all("SELECT * FROM domains", function(err, rows) {
        rowsLength = rows.length;
        for (var i = 0; i < rowsLength; i++) {
            domainName = rows[i].domain_name;
            /*build an object with a properties named as domains, and use this object to track counts
            this is more efficient than building an array because we don't need to search
            to see if that domain has already been appended to the array
            */
            if (!domainsObj[domainName]) {
                domainsObj[domainName] = {
                    name: domainName,
                    countBeforeThirty: 0,
                    countDuringThirty: 0,
                    totalCount: 0
                };
            }
            //keep track of when this count was added, to save processing later
            if (rows[i].date_entered > minDate) {
                domainsObj[domainName].countDuringThirty++;
            } else {
                domainsObj[domainName].countBeforeThirty++;
            }
            domainsObj[domainName].totalCount++;

            /* now that we have this object built, we can use insertion sort to create an array with the top 50
            domains by count
            */
        }
        for (domainName in domainsObj) {
            var domain = domainsObj[domainName];
            if (sortedDomainsList.length === 0) {
                sortedDomainsList.push(domain); //insert the first element
            } else {
                for (var i = 0; i < sortedDomainsList.length; i++) {
                    if (domain.totalCount >= sortedDomainsList[i].totalCount) {
                        sortedDomainsList.splice(i, 0, domain);
                        break;
                    }
                    if (i === sortedDomainsList.length - 1) {
                        sortedDomainsList.push(domain); //smallest count
                    }
                }
            }
        }
        sortedDomainsList.length = 50; //truncate everything not in the top 50
        var sortedDomainsLength = sortedDomainsList.length //save in memory so we don't recalculate everytime
        var percentageGrowth;
        for (var i = 0; i < sortedDomainsLength; i++) {
            if (sortedDomainsList[i].countBeforeThirty === 0) {
                percentageGrowth = "N/A";
            } else {
                percentageGrowth = ((sortedDomainsList[i].totalCount - sortedDomainsList[i].countBeforeThirty) / sortedDomainsList[i].countBeforeThirty) * 100;
                percentageGrowth = percentageGrowth.toFixed(3);
            }
            sortedDomainsList[i].percentageGrowth = percentageGrowth;
        }
        sortedDomainsList.sort(function compare(a, b) { //- for a and + for b
            a = a.percentageGrowth;
            b = b.percentageGrowth;
            if (a === "N/A") {
                return 1;
            }
            if (b === "N/A") {
                return -1;
            }
            return b - a;
        });
        cb(sortedDomainsList);
    });
}

database.getDayCount = function() {
    return database.dayCount;
}

database.incrementDayCount = function() {
    database.dayCount++;
}

database.getAllEmails = function(cb) {
    db.all("SELECT addr AS addr FROM mailing", function(err, rows) {
        cb(err, rows)
    });
}

database.closeDb = function() {
    db.close();
}
module.exports = database;
