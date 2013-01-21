---
layout: post
title: 'JavaScript Toy: 3D Hypercube'
---

{{ page.title }}
================

<p class="meta">January 7th, 2013</p>

[Hypercube](https://github.com/PeteMichaud/hypercube) is a JavaScript toy that’s sort of pretty, and kind of fun. It
uses trigonometry to place "vertices" in a 3D configuration. It was written before HTML5 and canvas were things, it uses
html characters as the vertices.

[Click here to check out the demo](http://petemichaud.github.com/hypercube). Follow the instructions carefully.

Here's the money shot:

{% highlight javascript %}
function render()
{
	//loop through all 27 vertices
	vertIndex = 0;
	for (x =- dimension; x <= dimension; x += dimension)
	{
		for (y =- dimension; y <= dimension; y += dimension)
		{
			for (z =- dimension; z <= dimension; z += dimension)
			{
				//calculate the position, size, and color of the vertices based on the mouse coordinates (a, b)
				u = x;
				v = y;
				w = z;

				u2 = u * Math.cos(a) - v * Math.sin(a);
				v2 = u * Math.sin(a) + v * Math.cos(a);
				w2 = w;

				u = u2;
				v = v2;
				w = w2;

				u2 = u;
				v2 = v * Math.cos(b) - w * Math.sin(b);
				w2 = v * Math.sin(b) + w * Math.cos(b);

				u = u2;
				v = v2;
				w = w2;

				var c = Math.round((w + 2) * 70);
				if (c < 0) c = 0;
				if (c > 255) c = 255;

				//assign the calculated value to the current vertex
				with ($verts[vertIndex].style)
				{
					left = hCenter + u * (w + 2) * vertSpacing;
					top  = vCenter + v * (w + 2) * vertSpacing;
					color = 'rgb(0, ' + c + ', 0)';
					fontSize = (w + 2) * vertSize + "px";
				}
				vertIndex++;
			}
		}
	}
}
{% endhighlight %}

This calculates the position of each vertex in space relative to the center of the window, then sizes and colors it
appropriately to imply 3D positioning.

