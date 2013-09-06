---
layout: post
title: Automagic Multisite Server with Jekyll and Nginx on a DigitalOcean Droplet
---

{{ page.title }}
================

<p class="meta">September 6th, 2013</p>

## The Problem

I have a bunch of small sites that are well suited to using [Jekyll](http://jekyllrb.com/ "Jekyll: Static Site Generator"),
but I didn't have a bonehead easy way to get them online. My non-solution so far has been to have a DreamHost VPS, and
just spin up a WordPress site on that badboy whenever I want a throwaway site. But that's expensive, inflexible,
*totally uncool*, and it's not Jekyll so it's slow, especially if you get hit with a lot of traffic at once.

But it sure is easy.

So what I wanted is an *expandable* server that:

1.	Can have an arbitrary number of sites on it, that
2.	will automatically update any of the sites I assign to it,
3.	without me doing anything beyond making the changes and pushing to github.
4.	Bonus points if it can set up a new site, as well as updating existing ones.

## The Solution

So what I wanted to do is:

1.	Spin up a tiny Droplet on [DigitalOcean](https://www.digitalocean.com/?refcode=d973a609091c) (that's about $5 a month)
2.	Set up nginx on it to serve more than one site
3.	Create a shell script that generates a new server block (aka virtual host) given just the new domain
4.	Write a tiny Sinatra app to act as a github webhook endpoint. The endpoint should:
	1.	Clone the updated site to a temp directory
	2.	Create a new server block in nginx if the site doesn't already exist
	3.	Create a new DNS record if the site doesn't already exist
	4.	Use Jekyll to build the files and put them in the right public_html directory

> **Note**: If you have no idea what github, VPS, nginx, shell script, sinatra, etc mean, then this tutorial is not for you.
> If you've never used a linux command line, this tutorial is not for you.
> I try to be thorough here, but you're going to get lost unless you have a grasp of the technology here.

What a shitshow this all was to get set up, but it fully works, so here's the scoop:

## The Droplet

This is the easy part.

Go into the DigitalOcean control panel and create a droplet. I used Ubuntu 13.04 x64. This should
all work in theory in other versions, but if you want to be safe, use the same.

**Note the IP it gives you** because we'll be using it (for this tutorial I'll refer to that IP
as **XXX.XXX.XXX.XXX**). Serving html files only is the easiest job a server can possibly do, so
a small droplet will be fine unless you're expecting massive traffic.

### DNS

> **Note**: You don't have to follow this part strictly if you really know what you're doing. If you're not
> 100% sure you know what you're doing and that you know enough to modify my instructions where
> appropriate, then just follow this section exactly.

For the purposes of this tutorial, I'm going to assume your domain is **mysite.com**.

You should own mysite.com through a service like [NameCheap](http://www.namecheap.com), and from
NameCheap (or whatever service you use), you should assign the DigitalOcean name servers to the
domain. (The name servers are ns1.digitalocean.com, ns2.digitalocean.com, ns3.digitalocean.com).

Then, in the DigitalOcean control panel, click DNS and add mysite.com, pointing at the droplet IP
you just got.

This will give you a domain you can work with throughout this tutorial, and it can act as a "base
domain" for later when we set up a git webhook.

### Accessing the Droplet

Almost everything from now on will happen on the command line:

{% highlight bash %}
$ ssh root@XXX.XXX.XXX.XXX
{% endhighlight %}

It'll ask you if you trust the host, and you'll say "yes". Then it'll ask you for your root password. DigitalOcean
created that password when you created the droplet, and they sent it to you via e-mail, so check your inbox.

Once you're in, first you probably want to change the root password to something secure, that you can remember:

{% highlight bash %}
$ passwd
{% endhighlight %}

### Installing the Prerequisites

You'll need some software installed on the server: nginx, ruby, rubygems, and a few gems including jekyll.

First, update apt-get

{% highlight bash %}
$ sudo apt-get update
{% endhighlight %}

Then install Nginx:

{% highlight bash %}
$ sudo apt-get install nginx
{% endhighlight %}

That was really tough, I know, but stick with me.

We're going to use RVM to install ruby:

{% highlight bash %}
$ sudo apt-get install curl
$ \curl -L https://get.rvm.io | bash -s stable
{% endhighlight %}

Now, to actually use RVM we'll have to use the **source** command. You might add this to your bash profile, but you're not
going to use rvm after this so it's probably not worth adding. If you don't know what any of that means, don't sweat it.

Normally rvm sits at **~/.rvm/scripts/rvm** so that's the path I'll use. If it gives you an error, then you need
to figure out where your **/.rvm** directory is and change the following command to that path instead:

{% highlight bash %}
$ source ~/.rvm/scripts/rvm
{% endhighlight %}

So now that you have access to the rvm command, you're going to use it to install ruby and rubygems:

{% highlight bash %}
$ rvm requirements
$ rvm install ruby
$ rvm use ruby --default
$ rvm rubygems current
{% endhighlight %}

Now you have ruby and rubygems ready to go. You can check by typing "ruby -v" into the command line. We're going to
install a few gems we'll use later:

{% highlight bash %}
$ gem install jekyll
$ gem install sinatra
$ gem install thin
$ gem install json
{% endhighlight %}

If you want VIM or whatever, now's the time to get it. I'm going to act like you're using nano just because nano comes
default, but feel free to use whatever.

> **Note**: If you don't know what VIM or nano are, you just need to know that they are text editors. Nano comes with
> Ubuntu, and it'll work fine, but you can actually use whatever editor you want, if you have a favorite.

### Test Site

We're going to manually create a site that nginx can serve, just to make sure it's all working. First we'll create the
folder it'll serve from, then we'll set the right permissions:

{% highlight bash %}
$ sudo mkdir -p /var/www/mysite.com/public_html
$ sudo chown -R www-data:www-data /var/www/mysite.com/public_html
$ sudo chmod 755 /var/www
{% endhighlight %}

Next you need to create an index file for nginx to serve out of your new directory:

{% highlight bash %}
$ sudo nano /var/www/mysite.com/public_html/index.html
{% endhighlight %}

{% highlight html %}
<html>
  <head>
    <title>www.mysite.com</title>
  </head>
  <body>
    <h1>Success: You Have Set Up a Virtual Host</h1>
  </body>
</html>
{% endhighlight %}

Save that file and exit.

### Set up the Test Server Block

Nginx comes with a default site configuration that you can copy. That'll work for this test site, even though you don't
want to use it in the long term. We'll use it for now and blow it away later:

{% highlight bash %}
$ sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/mysite.com
$ sudo nano /etc/nginx/sites-available/mysite.com
{% endhighlight %}

Find the section of the file that looks like this, and make the appropriate changes:

{% highlight text %}
server {
        listen   80;
        #listen   [::]:80 default ipv6only=on; ## listen for ipv6

        root /var/www/mysite.com/public_html;
        index index.html index.htm;

        # Make site accessible from http://localhost/
        server_name mysite.com;
}
{% endhighlight %}

Save and Exit.

You've just edited a file called **/etc/nginx/sites-available/mysite.com**. The **sites-available** directory holds
"potential" sites, meaning sites that could be on the server, but that aren't there yet. To make nginx actually serve
the site you have to put the file into the **sites-enabled** directory. The best practice is actually not to copy the
file, but to create a symlink there instead, to keep things [DRY](http://en.wikipedia.org/wiki/Don't_repeat_yourself):

{% highlight bash %}
$ sudo ln -s /etc/nginx/sites-available/mysite.com /etc/nginx/sites-enabled/mysite.com
{% endhighlight %}

To avoid conflicts, you should also delete the default file you copied earlier:

{% highlight bash %}
$ sudo rm /etc/nginx/sites-enabled/default
{% endhighlight %}

Finally, restart nginx so the changes take effect:

{% highlight bash %}
$ sudo service nginx restart
{% endhighlight %}

> **Note**: you should see a nice message from nginx about restarting. If you see nothing, then something is wrong. To
> check what's wrong type **tail /var/log/nginx/error.log**. You'll see the end of the error log and it'll tell you
> what's wrong. Probably you screwed up the server block config file.

In your browser, hit mysite.com. Now you have nginx serving a static page. *Ah yiss*.

## The Server Block Script

I'm going to do things a little out of order here because some of the directories we need don't exist yet, but we need
the script that doesn't exist yet to create them. So first:

{% highlight bash %}
$ sudo nano new_nginx_server_block.sh
{% endhighlight %}

In that file, put this code:

{% highlight bash %}
#!/usr/bin/env bash
#nginx - new server block

# Functions
ok() { echo -e '\e[32m'$1'\e[m'; } # Green
die() { echo -e '\e[1;31m'$1'\e[m'; exit 1; }

# Variables
NGINX_AVAILABLE_VHOSTS='/etc/nginx/sites-available'
NGINX_ENABLED_VHOSTS='/etc/nginx/sites-enabled'
WEB_DIR='/var/www'
WEB_USER='www-data'

# Sanity check
[ $(id -g) != "0" ] && die "Script must be run as root."
[ $# != "1" ] && die "Usage: $(basename $0) domainName"

# Create nginx config file
cat > $NGINX_AVAILABLE_VHOSTS/$1 <<EOF
server {
  server_name $1;
  listen 80;
  root $WEB_DIR/$1/public_html;
  access_log $WEB_DIR/$1/logs/access.log;
  error_log $WEB_DIR/$1/logs/error.log;
  index index.html index.php;
  location / {
    try_files \$uri \$uri/ @rewrites;
  }
  location @rewrites {
    rewrite ^ /index.php last;
  }
  location ~* \.(jpg|jpeg|gif|css|png|js|ico|html)$ {
    access_log off;
    expires max;
  }
  location ~ /\.ht {
    deny  all;
  }
}
EOF

# Creating {public,log} directories
mkdir -p $WEB_DIR/$1/{public_html,logs}

# Creating index.html file
cat > $WEB_DIR/$1/public_html/index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
        <title>$1</title>
        <meta charset="utf-8" />
</head>
<body class="container">
        <header><h1>$1<h1></header>
        <footer>© $(date +%Y)</footer>
</body>
</html>
EOF

# Changing permissions
chown -R $WEB_USER:$WEB_USER $WEB_DIR/$1

# Enable site by creating symbolic link
ln -nfs $NGINX_AVAILABLE_VHOSTS/$1 $NGINX_ENABLED_VHOSTS/$1

# Restart
/etc/init.d/nginx restart ;

ok "Site Created for $1"
{% endhighlight %}

This script essentially does everything we did manually while we created the test mysite.com block. Nginx gets all the
config files and directories set up correctly to begin serving the new site, plus a placeholder index file so you can
make sure it works.

***

One other thing we need to do. Our test site works fine, but if we have more than one site on our server, it'll fail to
start because of a setting we need to change:

{% highlight bash %}
$ sudo nano /etc/nginx/nginx.conf
{% endhighlight %}

In this file you'll find a line that has a setting called **server_names_hash_bucket_size** that is either commented out
or set to 32. Change it to 64.

My explanation of what **server_names_hash_bucket_size** does isn't quite right. It's not that that setting allows for
more than one site, but mysite.com is probably less than 32 characters long, whereas subdomains like
thissubdomain.mysite.com can get go past the 32 character limit. server_names_hash_bucket_size must be set to a number
larger than the largest domain name you have a block for.

***

So, let me get a little ahead of myself and ask you to run the new script for the git.mysite.com domain:

{% highlight bash %}
$ ./new_nginx_server_block.sh git.mysite.com
{% endhighlight %}

Nginx may complain that it can't restart at this point, which is fine because the problem it's complaining about is what
we're about to fix. We're not actually ready to deal with the git subdomain yet, but having the folder there is useful,
mostly because it gives us a place to put the script we just created:

{% highlight bash %}
$ cp new_nginx_server_block.sh /var/www/git.mysite.com/new_nginx_server_block.sh
{% endhighlight %}

Now that you have the script to create a server block, I want to give you a script that deletes existing ones,
because:

1.	We're going to kill the mysite.com test block because the server block configuration screws everything up
	if you have more than one site (that's why nginx failed to restart just now when you created git.mysite.com).
2.	If your experience is anything like mine, you'll be backtracking a whole lot, and this just makes it easier.

From the **/var/www/git.mysite.com** directory:

{% highlight bash %}
$ sudo nano delete_nginx_server_block.sh
{% endhighlight %}

And use this code:

{% highlight bash %}
#!/usr/bin/env bash
#remove server block

rm -f /etc/nginx/sites-enabled/$1;
rm -f /etc/nginx/sites-available/$1;
rm -rf /var/www/$1;
/etc/init.d/nginx restart ;
{% endhighlight %}

Save and Exit.

It just removes the server block configuration, deletes the www folder, then restarts nginx so the changes take
effect. Run it:

{% highlight bash %}
$ ./delete_nginx_server_block.sh mysite.com
$ ./new_nginx_server_block.sh mysite.com
{% endhighlight %}

That will delete the original test mysite.com block, and recreate it in a way that won't bungle everything. mysite.com
should be accessible from the browser right now. git.mysite.com is theoretically available, but we haven't set up the
DNS record for it to work yet. Let's do that.

## The Hook

The hook is tricky because we're on a server that only has nginx, which generally speaking can't run scripts at all.
We have to have a script though, in order to respond when github tells us that a site has been updated. Since we're
already using ruby for Jekyll, it makes sense to use Sinatra, a light weight ruby web framework.

### DNS

We already set up our hook endpoint in nginx--that's what git.mysite.com is for. We don't have the DNS automatically
updating yet, so let's make that actually work by setting up the DNS ourselves.

In the DigitalOcean control panel, click **DNS** on the left. Click the **View** icon to the right of mysite.com, under
Domains.

Click the large **Add Record** button near the top. Select **CNAME** as the type, then input "git" as the name and "@" as
the hostname. That just tells the subdomain "git" to redirect to the same place as the A record for this domain, which
is the droplet IP address.

Click **Create** and you're done. It shouldn't take long to propagate, so soon you should be able to visit
git.mysite.com and see the test page we set up before.

### Nginx

Now, since git.mysite.com is going to serve our tiny Sinatra app instead of Jekyll sites, we need to edit the
configuration manually:

{% highlight bash %}
$ sudo nano /etc/nginx/sites-available/git.mysite.com
{% endhighlight %}

Here's the new configuration:

{% highlight text %}
server {
  server_name git.mysite.com;
  listen 80;
  root /var/www/git.mysite.com/public_html;
  access_log /var/www/git.mysite.com/logs/access.log;
  error_log /var/www/git.mysite.com/logs/error.log;
  index index.html index.php;

  location / {
    try_files $uri @app;
  }

  location @app {
    proxy_pass http://localhost:4567;
  }
}
{% endhighlight %}

Save and Exit.

Basically we're just passing any requests to **git.mysite.com/** along to the port that Sinatra will be listening on (4567
is the default Sinatra port).

If that's confusing, then think of it this way: nginx will receive a request at port 80
from the outside world. If that request meets certain criteria, nginx will make its own request to the local server, but
on the port that Sinatra is listening on. Sinatra will process the request, and pass the result back to nginx,
and nginx will pass the result back to whoever asked for it in the first place (probably github).

You can also delete **/var/www/git.mysite.com/public_html** if you want, since we only need **/var/www/git.mysite.com**.
Don't delete the log directory or nginx won't be able to restart.

### Sinatra Script

Now that we have nginx ready to pass a request on to Sinatra, let's set up Sinatra.

Early in this tutorial you installed a bunch of gems: jekyll, sinatra, thin, json. This part is why you did all that.

Create a file in **/var/www/git.mysite.com/** called **githook.rb**, with the following content:

{% highlight ruby %}
require 'sinatra'
require 'thin'
require 'json'

git_user = "[YOUR_GIT_USERNAME_HERE]"
tmp_dir = "/tmp/jekyll/"
web_dir = "/var/www/"
output = ""

 post '/' do
  payload = JSON.parse(params[:payload])
  site_name = payload["repository"]["name"]
  repo = "git@github.com:#{git_user}/#{site_name}.git"

  clone_cmd = "rm -rf #{tmp_dir}#{site_name}; git clone #{repo} #{tmp_dir}#{site_name};"
  output = `#{clone_cmd}`

  unless Dir.exists?("#{web_dir}#{site_name}")
    new_server_block_cmd = "./new_nginx_server_block.sh #{site_name}"
    output += "\n\nCreating Nginx site directories for #{site_name}\n\n"
    output += `#{new_server_block_cmd}`
  end

  build_cmd = "jekyll build --source #{tmp_dir}#{site_name} --destination #{web_dir}#{site_name}/public_html"

  output += "\n\nBuilding from source using Jekyll\n\n"
  output += `#{build_cmd}`

  puts output
  output
end
{% endhighlight %}

Be sure to insert your actual github username in there. This script gets the latest site code, creates the
nginx site if necessary, and builds from source using Jekyll.

> **Note**: No github password is necessary here because cloning a public github repository doesn't require a login.
> This works fine if all your sites are in public repositories. If you want to have a site in a private repository, then
> you'll need to configure this server with your deployment user's public key so you don't have to type a password,
> otherwise this script will fail. If you don't know what I'm talking about, just make your site's github repository
> public. If you want it to be private, there are lots of tutorials about how to set up authentication with keys.
> Godspeed.

> **Note 2**: One of my stated goals was to make the DNS update itself automatically if the record didn't already exist.
> This script does not do that yet. I'm working on a
> [ruby wrapper for the DigitalOcean API](https://github.com/PeteMichaud/digitalocean/tree/image), but it's not ready
> for prime time yet. So when you know you're uploading a new site to the server you have to go into the DigitalOcean
> control panel and manually add the DNS information. You only need to do this once per site and only for new sites.
> When the script is ready, I'll update this post.

If you hit git.mysite.com in your browser right now you'll get a 502 Bad Gateway error (if you're not seeing that, try
restarting nginx). The reason is that right now nginx is trying to pass requests to **http://localhost:4567** which is
where Sinatra should be listening. But Sinatra isn't running!

Run the sinatra server simply by typing:

{% highlight bash %}
$ ruby /var/www/git.mysite.com/githook.rb
{% endhighlight %}

You'll see the session attach to a Thin server process. Success.

> Note: Visiting git.mysite.com in your browser will still give a 502 error. Why? Because our dead-simple Sinatra app
> only listens for POST requests to '/', and when you tried to go there in the browser you sent it a GET request. So
> nginx passed the request to Sinatra, and Sinatra told nginx "I don't know what to do with this," so nginx told your
> browser "Stop messing around, knucklehead."

## Github

So we have a droplet that can listen for changes in a repository and update or create a site on the server in response.

The whole idea here is that we can use github to update our droplet, so we need to tell github how to contact us.

### End Point

One important thing to note is that this whole process works by convention: your github repository must be named
the exact site domain like **mysite.com** or **sub.mysite.com** -- whatever you want to type into the browser to pull up
the site is what you should name the github repository.

Now, create a new repository with the appropriate name. When it's done, go to the repository's settings, and click
"Service Hooks" on the left. At the top of the long list you'll see "WebHook URLs." Click that. In the text field
provided, type your git endpoint url: **http://git.mysite.com**.

### Local Repository

Now, if I were clever I would tell you to clone the new repository on your local, and generate the jekyll file structure
inside that directory. Jekyll doesn't really like to do that though. It works like this:

{% highlight bash %}
$ jekyll new mysite.com
{% endhighlight %}

Which creates a mysite.com directory with all the stuff in it. It's possible to generate the files in a tmp directory,
then copy them into an existing directory, but seriously man?

So here's the workaround. Once you create the github repository, type this into your local:

{% highlight bash %}
$ jekyll new mysite.com
$ cd mysite.com
$ git init
$ git add .
$ git commit -m "initial commit"
$ git add remote origin git@github:YOUR_USERNAME/mysite.com.git
$ git push origin master
{% endhighlight %}

Now your jekyll site is connected to the github repository, and guess what? When you pushed to origin, github told your
webhook url about it, and your webhook url built the site on your server. It's sitting there right now, waiting for you
to load it up.

**From now on, all you need to do to create a new website is:**

1.	Set up the domain via the DigitalOcean control panel
2.	Create new github repo with name of site (e.g. **petemichaud.com**)
3.	Set post commit hook on repo to your **http://git.mysite.com** endpoint
5.	Generate a new Jekyll site locally
6. 	Attach the new site to remote github repository
7.	Push generated files to origin

And from then on, every time you push new content to github, the site will be automatically in seconds. How cool is that?

### Acknowledgements

I want to thank a few people for their help getting all this working:

*	DigitalOcean documentation team
*	xybre
*	[Ogredude](https://github.com/ogredude)
*	Rob Dumas
*	[JohnneyLee Jack Rollins](https://github.com/Spaceghost)
