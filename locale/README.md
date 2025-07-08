# Localizing VacuumTube

VacuumTube has very few strings of it's own, but since it integrates with YouTube directly, it makes sense to localize them.

To get started on your own translation, you may need to have some JSON experience. If you're inexperienced, you can likely still do it.

First, follow these steps:

1. Open VacuumTube on a device with a keyboard.
2. Change your language to the one you intend to translate, and let YouTube reload.
3. Press **Ctrl+Shift+I** to open up developer tools.
4. Navigate to the **Console** tab.
5. Type `ytcfg.data_.HL` into the console and press enter.

This will provide you with the tag of the language you want to translate. If you want to translate a language by itself, without any regional dialects, you can remove everything after the `-`. This would turn `en-GB` to `en`, for example.

Then, fork VacuumTube and open the `locale` folder. If you don't know anything about GitHub or what forking is, you can just download the source code as a zip file and do it there, then create an issue. Otherwise, you should create a PR with your fork.

If there's already a file for your desired language, but not everything is translated, you can bring it up to date. You will need JSON experience for this though, since you'll be manually copy pasting objects.

Otherwise, copy the `en.json` file and paste it in the same directory. Rename it to the language tag you acquired previously, and make sure to keep the extension at the end.

After that, just go through every string and translate it to the desired language. Make sure it's properly formatted and gramatically correct, as every other string in the regular YouTube app is.

I'd recommend doing this in a more sophisticated editor that does syntax highlighting, especially if you're inexperienced with JSON since you may not know what parts to translate. Only translate the text between quotes, and make sure not to translate things like "h264ify", since that's the name of an extension.

Once you're done translating, either create a PR with your fork, or if you didn't know how to fork, open an issue with the translated JSON file.