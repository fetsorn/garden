export default async function(eleventyConfig) {
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("CLAUDE.md");

    eleventyConfig.setInputDirectory("11ty");
    eleventyConfig.setIncludesDirectory("_includes");
    eleventyConfig.setDataDirectory("_data");
    eleventyConfig.setOutputDirectory("11ty/_site");

    // static assets → _site/
    eleventyConfig.addPassthroughCopy("index.css");
    eleventyConfig.addPassthroughCopy("img");
    eleventyConfig.addPassthroughCopy({ 'robots.txt': '/robots.txt' });
    eleventyConfig.addPassthroughCopy({ '.domains': '/.domains' });
};
