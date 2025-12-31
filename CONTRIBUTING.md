# contributing to bunbu

halló!

thanks for contributing to [bunbu](https://github.com/welpo/bunbu). before implementing new features and changes, please [submit an issue](https://github.com/welpo/bunbu/issues/new) so that we can discuss it.

we welcome contributions in many forms, including:

- bug reports
- bug fixes
- feature requests
- improvements to the codebase
- documentation improvements
- new translations
- ui/ux suggestions

if you're not sure how to contribute or need help with something, please don't hesitate to reach out via the [issue tracker](https://github.com/welpo/bunbu/issues) or [email](mailto:osc@osc.garden?subject=[github]%20bunbu).

## getting started

make sure you have [node.js](https://nodejs.org/) installed, then:

```bash
git clone https://github.com/welpo/bunbu.git
cd bunbu
npm install
npm run dev
```

### pre-commit hook

we have a handy git hook that automatically formats your code, optimizes images, and runs type checks before every commit. to enable it:

```bash
cp pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

the development server will start at `http://localhost:4321`.

### available commands

- `npm run dev` — start the development server
- `npm run build` — type check and build for production
- `npm run preview` — preview the production build
- `npm run format` — format code with prettier

## coding guidelines

- format your code with prettier (`npm run format`)
- ensure your code passes type checking (`npm run build`)
- follow the existing code style
- css properties are sorted following [concentric-css](https://github.com/brandon-rhodes/concentric-css)

## pull requests

working on your first pull request? you can learn how from this free video series:

[**how to contribute to an open source project on github**](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

please make sure the following is done when submitting a pull request:

1. **keep your PR small**. small pull requests are much easier to review and more likely to get merged. make sure the PR does only one thing, otherwise please split it.
2. **use descriptive titles**. it is recommended to follow this [commit message style](#conventional-commit-messages-with-gitmoji).
3. **test your changes**. since bunbu is a pwa, test both online and offline functionality where relevant.
4. **fill the PR template**. the template will guide you through the process of submitting a PR.

before submitting:

- run `npm run format` to format your code
- make sure `npm run build` completes without errors

### conventional commit messages with gitmoji

see how a minor change to your commit message style can make you a better programmer.

format: `<gitmoji> <type>(<scope>): <description>`

`<gitmoji>` is an emoji from the [gitmoji](https://gitmoji.dev/) list. it makes it easier to visually scan the commit history and quickly grasp the purpose of changes.

`<scope>` is optional. if your change affects a specific part of the codebase, consider adding the scope. scopes should be brief but recognizable, e.g. `i18n`, `pwa`, or `analyzer`.

the various types of commits:

- `feat`: a new api or behavior **for the end user**.
- `fix`: a bug fix **for the end user**.
- `style`: changes to the visual appearance, e.g. css, fonts, images…
- `docs`: a change to the website or other markdown documents.
- `refactor`: a change to code that doesn't change behavior, e.g. splitting files, renaming internal variables, improving code style…
- `chore`: upgrading dependencies, releasing new versions… chores that are **regularly done** for maintenance purposes.
- `misc`: anything else that doesn't change production code, yet is not `chore`. e.g. updating github actions workflow.

the commits within your PR don't need to follow this convention (we'll [squash them](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests)). however, the PR title should be in this format. if you're not sure about the title, don't worry, we'll help you fix it. your code is more important than conventions!

example:

```
✨ feat(analyzer): add frequency percentage display
^  ^--^^--------^  ^-----------------------------^
|  |   |           |
|  |   |           +-> description in imperative and lowercase.
|  |   |
|  |   +-> the scope of the change.
|  |
|  +-------> type: see above for the list we use.
|
+----------> a valid gitmoji.
```

## code of conduct

we expect all contributors to follow our [code of conduct](./CODE_OF_CONDUCT.md). please be respectful and professional when interacting with other contributors.

## license

the code is available under the [GNU Affero General Public License v3.0 or later](./LICENCE).

thank you for your contributions!
