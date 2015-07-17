---
published: true
layout: post
---

{{ page.title }}
================

<p class="meta">July 16th, 2015</p>

Random number generators are generally uniform, ie. any number inside
the range is equally likely to be chosen. But what if you're generating
numbers that need to fall along a normal curve? For example, what if 
you're generating people for a game and those people have IQ scores? 

IQ has a mean of 100 and a standard deviation of 15. How do I generate
a population of people in which the IQ distribution is realistic?

![Normal Curve](/images/normal-curve.jpg)

{% highlight ruby %}
class NormalRandom

  DEFAULT_MU = 100
  DEFAULT_SIGMA = 15

  attr_accessor :rng

  def initialize
    self.rng = Random.new
  end

  def rand(mu = DEFAULT_MU, sigma = DEFAULT_SIGMA)
    (standard_deviations * sigma) + mu
  end

  def box_muller
    Math.sqrt(-2*Math.log(rng.rand))*Math.cos(2*Math::PI*rng.rand)
  end
  alias_method :standard_deviations, :box_muller

end

{% endhighlight %}

This is an implementation of the <strong>Box-Muller Transformation</strong>
which is one of the standard methods of generating normally distributed 
numbers. 

**Limitations**

Box-Muller is limited to generating numbers at most 6 standard deviations
from the mean. That is, the best score possible from this class is at the
<strong>99.9999998752th percentile</strong>. For most purposes that's fine.

The other thing is that the Box-Muller algorithm is slower than the 
[Ziggurat algorithm](https://en.wikipedia.org/wiki/Ziggurat_algorithm). 
Ziggurat, however, requires a table of values to work, and it's more
complex. My goal with this class was to be as bonehead simple as I 
possibly could be.

##Installation

I've packaged this code as a gem, so just: 

{% highlight ruby %}
  gem install normal_random
{% endhighlight %}

And you're off!

[Click here to view gem source on Github](https://github.com/PeteMichaud/normal_random).