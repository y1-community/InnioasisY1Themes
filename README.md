### Innioasis Y1 Themes for Original System Menus - 

### Want a new theme for your Y1? [Get started here](https://themes.innioasis.app) 
### Make themes? To submit a theme to this repository for listing on the themes directory you can do it

### Via Google Drive
You upload your theme folder to this [Google Drive folder](https://drive.google.com/drive/folders/1a6ztowRCbqww6LSOetUM9oUS9v10IKeF?usp=drive_link) taking care to add information and screenshots if you have the time (Optional - I'll put descriptions on the current themes and take screenshots soon - although you're welcome to submit your own edits, descriptions and URL as you please)

### Via GitHub
simply fork the repository and then add your information and screenshots, then submit a PR that we can merge into the website

### How to add information and screenshots.

When uploading the theme folder, if you have a moment, can you please add info to its config.json file (or include it in a text file and I can help place the info in your config.json file for you :)

and add any screenshots you'd like to show included in the folder as screenshot.jpg, screenshot2.jpeg screenshot.gif for example - you can include a series of screenshots if you wish. animated gifs will show first in theme previews.

### Editing the .json files (Don't panic if you don't code - editing it is explained below in layman's terms without needing to know how to code, when submitting changes, mistakes here will be noticed anyway so don't be afraid of getting it wrong:

You can manually add information about your theme by adding the below to your themes config.json - this will be parsed by the theme directory - perhaps use the URL to showcase an online portfolio, a website your theme's reddit post, or perhaps a cause you care about

1. On your theme's *config.json* at the very top, replace the single '{', with the below template, with your theme details: 

```
{
    "theme_info": {
        "title": "My Theme",
        "author": "John Doe",
        "authorUrl": "https://johndoe.com",
        "description": "A gorgeous theme for the Innioasis Y1 inspired by..."
    },
```

2. Similarly to add your theme details to the theme list (this is used for faster listings), where it would go alphabetically, see this template:

 ```
 {
      "name": "MyTheme",
      "folder": "MyTheme",
      "screenshot": "./MyTheme/screenshot.jpg",
      "description": "A gorgeous theme for the Innioasis Y1 inspired by...",
      "author": "John Doe",
      "authorUrl": "https://johndoe.com"
    },
```
  
For example, at the time of writing when adding Lain-Ish, I placed it above LCD

If it has to go between two themes:
look for 

```
    },
```
create a line below it with Enter (make sure its after the ',' and place it like this:

```
    },
--- *create a new line below }, and paste the template, enter your details* ----
```

If it has to go above a theme (usually because it's the first alphabetically, e.g your theme would go before 'Aero') then look for:

```
{
```
and paste your template and details, in the position shown below

```
---*create a new line above { and paste the template, enter your details----
{
```



### Collation of existing themes
I will try and add and document authors for themes where I find them online, if of course you do not wish for your theme to be listed on https://themes.innioasis.app or on the Google Drive or repo, please don't hesitate to contact us at teamslide@proton.me or submit an issue on this repository.

If adding someone else's theme, please make sure you credit them in the theme details and provide a link to where you found it in the 'authorUrl'
