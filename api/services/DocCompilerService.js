/**
 * Module dependencies
 */


var DocTemplater = require('doc-templater');


/**
 * Used for compiling markdown documentation into HTML templates.
 * @param  {Function} cb
 */

module.exports = function compileDocumentationMarkdown(cb) {


  // This is an HTML comment because it is easy to over-match and "accidentally"
  // add it underneath each code block as well (being an HTML comment ensures it
  // doesn't show up or break anything)
  // var TMP_LANG_MARKER_EXPR = /<!-- __LANG=\%[^%]*\%__ -->/;
  var LANG_MARKER_PREFIX = '<!-- __LANG=%';
  var LANG_MARKER_SUFFIX = '%__ -->';


  // This function is applied to each template before the markdown is converted to markup
  function beforeConvert(mdString, done) {

    // Based on the github-flavored markdown's language annotation, (e.g. ```js```)
    // add a temporary marker to code blocks that can be parsed post-md-compilation
    // by the `afterConvert()` lifecycle hook
    mdString = mdString.replace(/(```)([a-zA-Z]*)(\s*\n)/g, '$1\n' + LANG_MARKER_PREFIX + '$2' + LANG_MARKER_SUFFIX + '$3');

    return done(null, mdString);
  }

  // This function is applied to each template after the markdown is converted to markup
  function afterConvert(html, done) {

    // Replace github emoji with HTML
    html = html.replace(/\:white_check_mark\:/g, '<div class="replacementIcon yes"></div>');
    html = html.replace(/\:white_large_square\:/g, '<div class="replacementIcon no"></div>');
    html = html.replace(/\:heavy_multiplication_x\:/g, '<div class="replacementIcon never"></div>');

    // Replace ((bubble))s with HTML
    html = html.replace(/\(\(([^())]*)\)\)/g, '<bubble type="$1" colors="true"></bubble>');

    // Flag <h2>, <h3>, <h4>, and <h5> tags
    // with the `permalinkable` directive
    //
    // e.g.
    // if the page is #/documentation/reference/req
    // and the slug is "transport-compatibility"
    // then the final URL will be #/documentation/reference/req?q=transport-compatibility
    var cheerio = require('cheerio');
    var $ = cheerio.load(html);
    $('h2, h3, h4, h5').each(function() {
      var content = $(this).text() || '';

      // build the URL slug suffix
      var slug = content
        .replace(/[\?\!\.\-\_\:\;\'\"]/g, '') // punctuation => gone
        .replace(/\s/g, '-') // spaces => dashes
        .toLowerCase();

      // set the permalink attr
      $(this).attr('permalink', slug);

      // this was throwing ".wrap is undefined"
      if ($(this) && typeof $(this).wrap === 'function') {
        $(this).wrap('<div class="permalink-header"></div>');
      }

    });
    html = $.html();

    // Turn [beta|www].sailsjs.org hrefs into root-relative hrefs
    html = html.replace(/(href=")(https?:\/\/)(www\.|beta\.)?sailsjs\.org(\/[^"]*")/g, '$1$4');

    // Make sure all `#/` (angular-style) client-side URLs are transformed to `#!` (google/seo-style)
    html = html.replace(/(href=")\/?#(\/[^"]*)"/g, '$1#!$2"');

    // Add target=_blank to external links
    html = html.replace(/(href="https?:\/\/([^"]+)")/g, '$1 target="_blank"');

    // Add the appropriate `data-language` based on the temporary marker
    // (TMP_LANG_MARKER_EXPR) that was added in the `beforeConvert()` lifecycle
    // hook above
    // console.log('RAN AFTER HOOK, found: ',html.match(/(<code)([^>]*)(>\s*)(\&lt;!--\s*__LANG=\%[^\%]*\%__\s*--\&gt;)/g));

    // Interpret `js` as `javascript`
    html = html.replace(
      // $1     $2     $3   $4
      /(<code)([^>]*)(>\s*)(\&lt;!-- __LANG=\%js\%__ --\&gt;)\s*/gm,
      '$1 data-language="javascript"$2$3'
    );

    // Interpret `sh` and `bash` as `shell`
    html = html.replace(
      // $1     $2     $3   $4
      /(<code)([^>]*)(>\s*)(\&lt;!-- __LANG=\%(bash|sh)\%__ --\&gt;)\s*/gm,
      '$1 data-language="javascript"$2$3'
    );

    // When unspecified, default to `javascript`
    html = html.replace(
      // $1     $2     $3   $4
      /(<code)([^>]*)(>\s*)(\&lt;!-- __LANG=\%\%__ --\&gt;)\s*/gm,
      '$1 data-language="javascript"$2$3'
    );

    // Finally, nab the rest
    html = html.replace(
      // $1     $2     $3   $4               $5    $6
      /(<code)([^>]*)(>\s*)(\&lt;!-- __LANG=\%)([^%]+)(\%__ --\&gt;)\s*/gm,
      '$1 data-language="$5"$2$3'
    );

    return done(null, html);
  }


  // Compile the markdown into HTML templates
  DocTemplater()
  .build([{
    remote: 'git://github.com/balderdashy/sails-docs.git',
    remoteSubPath: 'reference',
    htmlDirPath: '.tmp/public/templates/reference/',
    jsMenuPath: 'assets/templates/jsmenus/reference.jsmenu',
    beforeConvert: beforeConvert,
    afterConvert: afterConvert,
  }, {

    remote: 'git://github.com/balderdashy/sails-docs.git',
    remoteSubPath: 'concepts',
    htmlDirPath: '.tmp/public/templates/concepts/',
    jsMenuPath: 'assets/templates/jsmenus/concepts.jsmenu',
    beforeConvert: beforeConvert,
    afterConvert: afterConvert,

  }, {
    remote: 'git://github.com/balderdashy/sails-docs.git',
    remoteSubPath: 'anatomy',
    htmlDirPath: '.tmp/public/templates/anatomy/',
    jsMenuPath: 'assets/templates/jsmenus/anatomy.jsmenu',
    beforeConvert: beforeConvert,
    afterConvert: afterConvert,
  }, {
    remote: 'git://github.com/balderdashy/sails-docs.git',
    remoteSubPath: 'getting-started',
    htmlDirPath: '.tmp/public/templates/gettingStarted/',
    beforeConvert: beforeConvert,
    afterConvert: afterConvert
  }, {
    remote: 'git://github.com/balderdashy/sails-docs.git',
    remoteSubPath: 'support/irc',
    htmlDirPath: '.tmp/public/templates/irc/',
    beforeConvert: beforeConvert,
    afterConvert: afterConvert
  }], cb);

};
