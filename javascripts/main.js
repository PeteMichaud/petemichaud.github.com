$(document).ready(function(){
    var $btn = $('.full-toggle-btn');
    var $full = $('.summary, .experience ul, .education > p');
    $btn.click(function(){
       $full.slideToggle('fast');

        var current_text = $btn.text();

        $btn
            .text($btn.data('toggle-anchor'))
            .data('toggle-anchor', current_text);

        return false;
   });
});