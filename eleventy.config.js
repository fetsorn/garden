export default async function(eleventyConfig) {
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("CLAUDE.md");

    // static assets → _site/
    eleventyConfig.addPassthroughCopy("index.css");
    eleventyConfig.addPassthroughCopy("img");
    eleventyConfig.addPassthroughCopy({ 'robots.txt': '/robots.txt' });
    eleventyConfig.addPassthroughCopy({ '.domains': '/.domains' });
};
