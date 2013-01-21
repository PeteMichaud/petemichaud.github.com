---
layout: post
title: rel="No-Refresh"
---

{{ page.title }}
================

<p class="meta">January 21st, 2013</p>

Asyncronous javascript is a marvelous tool, that was tacked onto a language that wasn't built for it by clever hackers
at Microsoft. In 1998 they released XMLHTTP which was an Internet Explorer component, and by 1999 the XMLHttpRequest
javascript object that was based on the original work had been adopted by all the major browsers. Ajax was born.

And it's great because it allows web pages to act like local software in terms of responsive and seamless interaction.

Any experienced web developer will tell you that it also sucks because the code required to drive those smooth
interactions is a morass of callbacks and variable scopes that's nearly impossible to debug or refactor.

I know there are lots of people experimenting with different solutions to the issue, but here's a solution that is easy
to implement in the browser, is entirely backward compatible, doesn't require we change the lanauges we use, and makes
our JavaScript incrediably simple.

## How Do Browsers Work?

Here's how browsers work, in a nutshell.

1. Retrieve Response from Server
2. Parse HTML to construct the DOM tree
3. Render tree construction
4. Layout of the Render Tree
5. Painting the Render Tree

In simple terms, after the DOM has been rendered according to the style rules, it then only repaints things as necessary.

For example, it will repaint a link that you're hovering over so it can change color. A slightly more expensive
operation is a reflow, which means something substantial has changed that may require elements on the page to actually
move around, changing the layout (step 4). That might be triggered by something as simple as a link turning bold when
you hover over it, or as complex as an ajax call that replaces the contents of an element with totally new content.

Still, a reflow is much cheaper than a full refresh, because only a small part of the page needs to be replaced, and
almost no additional requests are necessary (for things like stylesheets and layout images).

## rel="No-Refresh"

{% highlight html %}
<!--doesn't work cross site-->
<a href="restful/resource/1" rel="no-refresh">Ajax Link</a>
{% endhighlight %}

By setting this link to rel="No-Refresh" you're telling the browser that this link isn't really a whole new thing, it's
just a variation of the current page. In other words, the browser doesn't need to dump the current page and reload
everything, because the changes to the page will be similar to a reflow.

Therefore, on a `no-refresh` link, the browser will not reload the page. Instead it will:

1. Internally fetch the target URI
2. Perform a diff of the response body against the current DOM
3. Construct only the part of the DOM that has changed
4. Inject the changed content, and trigger a reflow of the document just as any other DOM manipulation

The user experience will be identical to an ajax call, but the code is much different. Here's an example of the best
case scenario, and I'll even use jQuery to make it even cleaner:

### Current Pattern

**HTML**
{% highlight html %}
<a href="restful/resource/1" class="ajax_link">Click Me!</a>
{% endhighlight %}

**JavaScript**
{% highlight javascript %}

$(document).ready(function(){
	$('.ajax_link').click(function(e){
		$.ajax({
			type: 'GET',
			url: $(this).attr('href'),
			dataType: 'html',
			error: function(xhr) {
				//do something about the error
				...
			},
			success: function (response) {
				$new = $(response);
				$('target').replace($new);
			}
		});
		e.preventDefault()
	});
});

{% endhighlight %}

**Server Side**

This part is complicated, but essentially you have to detect an **xmlhttprequest** or pass in an extra param to
let the server know you're making an ajax request. That way you can return the part of the page you want, instead of the
entire page.

The misdirection involved here, especially when using a framework like Rails, can get kind of hairy. Expect
to complicate your controller action, and break your view into partial chunks so you can render them separately.

### No-Refresh Pattern

**HTML**
{% highlight html %}
<a href="restful/resource/1" rel="no-refresh">Click Me!</a>
{% endhighlight %}

**JavaScript**
{% highlight javascript %}
//Disappointed?
{% endhighlight %}

**Server Side**

{% highlight ruby %}
#As far as your app is concerned, is doesn't do ajax at all.
{% endhighlight %}

Deadly simple.

## Considerations

### Error Handling

There are a few options for error handling, but the most obvious is just to load anything but a status 200 response as a
normal page (which means showing the server error page). That can be the default.

A more elegant solution is to handle the `noRefreshError` browser event. The event object could return all the request
information so you can handle different types of errors depending on the request URI.

It's not the most elegant, but here's an idea of how it would look:

{% highlight javascript %}
$(document).noRefreshError(function(e){
	switch(e.request_uri)
	{
		case this_url:
			handle_this();
			break;
		case that_url:
			handle_that();
			break;
		default:
			handle_default();
			break;
	}
});
{% endhighlight %}

Which would pretty readily be capsulated as something like:

{% highlight javascript %}
$(document[uri=this_url]).noRefreshError(function(e){
	//handle this_url error
});
{% endhighlight %}

Remember that this system would automatically handle rendering error messages due to a user error, like trying to delete
something without sufficient permission. That's a 200 response, and would be handled normally. Only when the server
failed to return a successful response would you have to handle the error.

### Animation

Often when something on the page changes after a successful ajax call we want to animate it to draw attention to it.
That's currently handled by the JavaScript callback function.

Instead, you could implement many of the animations as css transitions, sliding or fading as desired. The css animation
model is less robust than the tools we have through javascript, so we'd lose that unless and until the css transitions
become better.

### Security

The JavaScript security model prevents cross site scripting, and the same rules can apply to `no-refresh`. Since a
no-refresh link would not update the browser's URL field, it's important that sites can only call a no-refresh link
from within the same domain.

### Load Time &amp; Server Load

This method sacrifices some page speed because it requires the server return everything, not just the chunks. It also
requires a new diff operation between the current DOM and the new DOM instead of manual insertion of the changed
elements.

Benchmarks would have to be performed, but I suspect the extra load would be negligable, especially
considering the browser-level optimizations that become possible.

You also save programmer cycles because you eliminate fairly large and generally flakey areas of code from all web
applications that use this technology.

## Conclusion

This technology is relatively simple to implement in the browser as it relies on subsystems that are already well
established. It solves a big problem with unmaintainable code on the client side, and more complex code on the server
side. It does this all while being totally backward compatible with graceful degradation. Plus it reduces the need for
JavaScript requests and execution.

It's also possible to shim this behavior. The most difficult part of both the browser and shim implementations will be
the diff and injection portions, but both are very doable. I'm looking for feedback on the idea, and once I have a
robust concept, I can write the shim a a Proof of Concept. Then in only 20 or 30 years of commitee approvals, we can
have full browser adpotion!
