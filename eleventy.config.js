export default async function(eleventyConfig) {
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("CLAUDE.md");

    eleventyConfig.setInputDirectory("11ty");
    eleventyConfig.setIncludesDirectory("_includes");
    eleventyConfig.setDataDirectory("_data");
    eleventyConfig.setOutputDirectory("11ty/_site");

    // static assets → _site/
    eleventyConfig.addPassthroughCopy("theme/index.css");
    eleventyConfig.addPassthroughCopy("theme/img");
    eleventyConfig.addPassthroughCopy({ 'theme/robots.txt': '/robots.txt' });
    eleventyConfig.addPassthroughCopy({ 'theme/.domains': '/.domains' });
    eleventyConfig.addPassthroughCopy({ 'theme/rules': '/rules' });
};
