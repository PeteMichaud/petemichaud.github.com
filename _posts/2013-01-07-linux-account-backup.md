---
layout: post
title: Linux Hosting Account Backup
---

{{ page.title }}
================

<p class="meta">January 7th, 2013</p>

If you’re on a linux host, you might find this useful. It will backup all the websites and their MySQL databases into
an archive folder that you can download regularly. This script runs weekly on my host, and backs up my dozen or so sites
and databases. You’ll need a shell user probably, and the ability to set up CRON jobs.

## Create the Folders

In the root directory of your account, *above the web root*, create a folder called **/backup**, and inside that create
another folder called **/archive**.

CHMOD those sufficiently for your shell user to write to, probably 755 is good.

## Create the Files

In the **/backup** folder, place two files — domain.sh, and mysql.sh:

### domain.sh

    #!/bin/bash
    cd /home/[username]/
    suffix=$(date +%y%m%d)
    for domain in *.*
    do
        echo "Processing $domain"
        test -d "$domain" || continue
        tar -cf /home/[username]/backups/archives/${domain}.$suffix.tar ${domain}/
    done

### mysql.sh

    #!/bin/bash
    cd /home/[username]/backups/
    mkdir mysql
    suffix=$(date +%y%m%d)
    MYSQL="$(which mysql)"
    databases="$($MYSQL -u [sqluser] -h [server] -p[pass] -Bse ‘show databases’)"
    for database in $databases
    do
      echo "Processing database $database"
      mysqldump –opt -u[user] -p[pass] -h [server] ${database} > mysql/${database}.$suffix.sql
    done
    tar -cf archives/mysql_backup.$suffix.tar mysql/*
    rm -r mysql/

Make sure those files are in the right format — if you’re on a windows machine, FTPing into your linux server, and if
you try running them and get a hard time, try using the dos2unix utility via the shell on them to convert the characters.

Try running both of those files on the command line, to make sure they don’t error out. You should see a zip for each of
your sites in the archive folder, plus one zip containing the database dumps for all your databases. If you do, then
move on.

## Set up the CRON Job

CRON jobs are just scheduled tasks on a linux machine. You can set them up to execute at any interval you want. Most
hosting companies have simple CRON interfaces now so you don’t have to futz around with the actual text files. If you do
have to futz, and you need help, here’s a [CRON tutorial](http://clickmojo.com/code/cron-tutorial.html).

Set up two CRON jobs to run each backup script at a low traffic time. I run mine at midnight on Saturday. You can run
your more or less frequently, and at whatever time you want.

## Tell someone you Love them today

This step isn’t necessary to get your backups working, but it'd sure make someone happy.