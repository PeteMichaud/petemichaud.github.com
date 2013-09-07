---
layout: post
title: Wordpress to Jekyll Converter
---

{{ page.title }}
================

<p class="meta">September 7th, 2013</p>

I'm going through the process of converting all my WordPress sites to [Jekyll](http://www.jekyllrb.com). Jekyll makes it
easy to convert by providing import scripts from various platforms including Wordpress.

All I had to do was Export the xml file from the Wordpress admin panel, then run the [Wordpress
importer](http://jekyllrb.com/docs/migrations/).

That's great except the resulting files are HTML files, not markdown. And the text is not hard wrapped, which is fine if
you're using a program with soft wraps, but I don't like my IDE softwrapping, so I want to insert hard breaks at a
certain column width.

To fix the problems, I created a throwaway script. Drop this into the the root of your Jekyll site, then run it from the
 command line.

[See the Gist](https://gist.github.com/PeteMichaud/6477449#file-jekyll_import_converter-rb)

{% highlight ruby %}
require 'html2markdown' #gem install html2markdown

dirs = %w(_pages _posts)

class String
  def word_wrap(line_width = 120)
    self.split("\n").collect do |line|
      line.length > line_width ? line.gsub(/(.{1,#{line_width}})(\s+|$)/, "\\1\n").strip : line
    end * "\n"
  end
end

def md(file_name)
  file_name.chomp(File.extname(file_name)) + '.md'
end

dirs.each do |dir|
  Dir.open(dir) do |d_handle|
    d_handle.reject{ |f| f == '.' || f == '..' }.each do |file_name|

      content = HTMLPage.new(:contents => File.read("#{dir}/#{file_name}"))
      File.write("#{dir}/#{md(file_name)}", content.markdown.word_wrap)

    end
  end
end
{% endhighlight %}