$(document).ready(function(){
    var $btn = $('.full-toggle-btn');

    $btn.click(function(){
       $('.summary, .experience ul, .education > p').slideToggle('fast');

        var current_text = $btn.text();

        $btn
            .text($btn.data('toggle-anchor'))
            .data('toggle-anchor', current_text);

   });
});