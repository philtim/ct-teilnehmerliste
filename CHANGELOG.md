# Changelog

## [1.0.2](https://github.com/philtim/ct-teilnehmerliste/compare/v1.0.1...v1.0.2) (2026-10-16)


### Bug Fixes

* **api:** fall back to the page's own origin, not a host baked into the build ([1a0298d](https://github.com/philtim/ct-teilnehmerliste/commit/1a0298d3ec2271ac961536c462ecc8ca56d0fa28))
* **kv-store:** let a row without a value through instead of failing the read ([625f3e3](https://github.com/philtim/ct-teilnehmerliste/commit/625f3e315abe26afbda4ec042c8c0d9328aef207))

## [1.0.1](https://github.com/philtim/ct-teilnehmerliste/compare/v1.0.0...v1.0.1) (2026-10-16)


### Bug Fixes

* **groups:** find a single-digit id, and say when a query is too short ([b124293](https://github.com/philtim/ct-teilnehmerliste/commit/b124293b8d97e6f59c6572acb4c2b908fb705816))
* **groups:** refuse a foreign link without a scheme, and fail a failed id lookup ([7cf366d](https://github.com/philtim/ct-teilnehmerliste/commit/7cf366d5927e6da5d9d6a9c7f4645088a18b4245))
* **ui:** keep focus on the download button while the file is written ([f01bc6b](https://github.com/philtim/ct-teilnehmerliste/commit/f01bc6b6635f03dc8fb3a6d444383fd4a621b8b3))
* **ui:** say when a link's group parameter is no group id ([85c59ac](https://github.com/philtim/ct-teilnehmerliste/commit/85c59ac303b49f9aeaa1c47b429da032a4a28c0a))

## 1.0.0 (2026-10-16)


### Features

* choose a group, preview its families and pick the columns ([7e8d620](https://github.com/philtim/ct-teilnehmerliste/commit/7e8d6203636ab2c3bf6590537dbf55767ffa2092))
* **export:** download the list as an Excel file ([2afe412](https://github.com/philtim/ct-teilnehmerliste/commit/2afe412d86246def232d78457e70a3f082c97b74))
* **families:** detect households among a group's members ([4537d81](https://github.com/philtim/ct-teilnehmerliste/commit/4537d8131b0c397f412fea6368efe4f59c9c05ee))
* **members:** build the column catalogue and the family-ordered list ([1ebf359](https://github.com/philtim/ct-teilnehmerliste/commit/1ebf3598ba5d816eef3a5bc57ad1212b58a2de74))
* **members:** load a group's members with persons, fields and relationships ([9946cab](https://github.com/philtim/ct-teilnehmerliste/commit/9946cab0d4e0fb9155787669935d81974ff20e05))


### Bug Fixes

* **columns:** read text as a number only when it cannot be a thousands value ([063dabf](https://github.com/philtim/ct-teilnehmerliste/commit/063dabfb368837d2afa2cfd31707d689c7aef74a))
* **export:** say in the file what the list leaves out, and give links a value ([ea2a44b](https://github.com/philtim/ct-teilnehmerliste/commit/ea2a44ba044a2d14f9e1d3981395c9acd5ed0348))
* **groups:** keep the name matches when the id lookup fails ([d1a98d9](https://github.com/philtim/ct-teilnehmerliste/commit/d1a98d9d18f6b65dbe6f378bc5390e02b8d3f904))
* **members:** keep other viewers' column choices and never drop a save ([716c239](https://github.com/philtim/ct-teilnehmerliste/commit/716c239a30536c9bb9463187ec3a82fcc9530e75))
* **ui:** move focus with the step, announce only the status line ([677e841](https://github.com/philtim/ct-teilnehmerliste/commit/677e8417b393eab35e0d8dcf4c5461620f4bac94))
