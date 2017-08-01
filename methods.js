module.exports = {
    regex: /(?:&nbsp;|<br>)|(?:&ndash;|<br>)|(?:&raquo;|<br>)|(?:&laquo;|<br>)|(?:&ldquo;|<br>)|(?:&rdquo;|<br>)|(?:&mdash;|<br>)|(?:&nbs;|<br>)|(?:&rsquo;|<br>)|(<([^>]+)>)/g,
    random: function(list){
        return list[Math.floor((Math.random()*list.length))];
    }
};