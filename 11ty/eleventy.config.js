export default async function(eleventyConfig) {
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("theme/");
    eleventyConfig.setInputDirectory(".");
    eleventyConfig.setIncludesDirectory("_includes");
    eleventyConfig.setDataDirectory("_data");
    eleventyConfig.setOutputDirectory("_site");

    // static assets → _site/ (remap to output root)
    eleventyConfig.addPassthroughCopy({ 'theme/index.css': '/index.css' });
    eleventyConfig.addPassthroughCopy({ 'theme/img': '/img' });
    eleventyConfig.addPassthroughCopy({ 'theme/robots.txt': '/robots.txt' });
    eleventyConfig.addPassthroughCopy({ 'theme/.domains': '/.domains' });

    // offer landing pages: handled by pages/offers.njk + htmlPages.js
};
