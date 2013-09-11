---
layout: post
title: DigitalOcean API Gem
---

{{ page.title }}
================

<p class="meta">September 11th, 2013</p>

As part of my [attempt to make setting up Jekyll sites
bonehead easy for myself]({% post_url 2013-09-05-multisite-server-jekyll-digitalocean %}), I wanted to make the
script smart enough to actually set up the DNS records for a new site without any human intervention.

I could just hit the DigitalOcean API raw, but that's ugly and not maintainable, and I'm not a big fan of chlamydia.

Part of the problem is that the only [gem that encapsulates the DigitalOcean
API](https://github.com/signatureio/digitalocean) is incomplete.

But not so much any more. I [wrote some new functionality](https://github.com/signatureio/digitalocean/pull/3), enabling
fiddling with Domains and DNS Records via the provided objects.

Now all I need to do to finish my script is get the github edge for that gem, and use my new changes to intelligently
set up the records I need.

It's almost like I know what I'm doing!
