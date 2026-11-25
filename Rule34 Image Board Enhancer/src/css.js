// css.js – zentrale CSS-Sammlung (Muster: Rule34 Combined Scripts/src/css.js).
// Die drei Style-Blöcke des Originals (createToolbar, Favorite-Tags main/USER)
// als benannte Konstanten; injiziert wird über addGlobalStyle (core.js) genau
// dort, wo das jeweilige Feature aktiv wird – identische Stellen wie im Original.

export const MAIN_CSS = `
                html.ibenhancerSettingVisible { overflow: hidden !important; }
                #ibenhancer { background: #000000 !important; border: solid 1px grey; padding: 5px; width: auto; text-align: center !important; margin-right: auto; }
                #ibenhancer, #ibenhancerSettings label { font-size: 15px !important; font-family: Arial, sans-serif !important; font-style: normal !important; font-weight: normal !important; text-align: center; }
                #ibenhancerSettings-blocker { position: fixed; background-color: rgba(0, 0, 0, .5); width: 100vw; height: 100vh; top: 0; left: 0; z-index: 1; display: none; }
                #ibenhancerSettings-blocker.show { display: block; }
                #ibenhancerSettings { position: fixed; width: 400px; height: 400px; left: calc(50vw - 155px); top: calc(50vh - 165px); background-color: black; border: 2px solid black; border-radius: 3px; padding: 10px; text-align: left; z-index: 999999; display: none; color: #181a1b; padding-bottom: 0px; }
                #ibenhancerSettings-options { overflow-y: auto; overflow-x: hidden; width: 100%; height: calc(100% - 32px); }
                #ibenhancerSettings-options label { white-space: nowrap; color: white;}
                #ibenhancerSettings input { margin: 5px; width: auto; }
                #ibenhancerSettings input[type=number], #ibenhancerSettings select { border: solid 1px darkgrey; background: #fff; }
                #ibenhancer button { width: auto; border: solid 1px darkgrey !important; background: black !important; cursor: pointer; color: white; }
                #ibenhancerSettings.show { display: block; }
                #fitContentButton, #scrollContentButton { width: 73px !important; }
                #ibenhancerSettingsButton { margin: auto !important; position: relative; }
            `;

export const FAVORITE_TAGS_CSS = `
            #ibenhancer-favorite-tags > details > summary { margin-left: -8px; list-style: none; cursor: pointer; }
            #ibenhancer-favorite-tags details summary::-webkit-details-marker { display: none; }
            #ibenhancer-favorite-tags details summary:after { content: '►'; float: right; transform: rotate(90deg); }
            #ibenhancer-favorite-tags details[open] summary:after { transform: rotate(270deg); }
            #ibenhancer-favorite-tags details { text-align: left; padding: 2px 8px; color: white; }
            #ibenhancer-favorite-tags details[open] { height:525px; }
            #ibenhancer-favorite-tags-edit-button { color: white; cursor: pointer; user-select: none; margin-right: 100px; }
            #ibenhancer-favorite-tags-edit-button:hover { text-decoration: underline; }
            #ibenhancer-favorite-tags #ibenhancer-favorite-tags-editor { display: none; }
            #ibenhancer-favorite-tags.edit #ibenhancer-favorite-tags-content { display: none; }
            #ibenhancer-favorite-tags.edit #ibenhancer-favorite-tags-editor { display: block; }
            #ibenhancer-favorite-tags-list { display: flex; flex-direction: column; max-height: 500px; overflow-y: auto; overflow-x: hidden; }
            #ibenhancer-favorite-tags-list a { color: #ff6c6c; }
        `;

export const FAVORITE_TAGS_USER_CSS = `
            #ibenhancerUSER-favorite-tags > details > summary { margin-left: -8px; list-style: none; cursor: pointer; }
            #ibenhancerUSER-favorite-tags details summary::-webkit-details-marker { display: none; }
            #ibenhancerUSER-favorite-tags details summary:after { content: '►'; float: right; transform: rotate(90deg); }
            #ibenhancerUSER-favorite-tags details[open] summary:after { transform: rotate(270deg); }
            #ibenhancerUSER-favorite-tags details { text-align: left; padding: 2px 8px; color: white; }
            #ibenhancerUSER-favorite-tags details[open] { height:532px; }
            #ibenhancerUSER-favorite-tags-edit-button { color: white; cursor: pointer; user-select: none; margin-right: 100px; }
            #ibenhancerUSER-favorite-tags-edit-button:hover { text-decoration: underline; }
            #ibenhancerUSER-favorite-tags #ibenhancerUSER-favorite-tags-editor { display: none; }
            #ibenhancerUSER-favorite-tags.edit #ibenhancerUSER-favorite-tags-content { display: none; }
            #ibenhancerUSER-favorite-tags.edit #ibenhancerUSER-favorite-tags-editor { display: block; }
            #ibenhancerUSER-favorite-tags-list { display: flex; flex-direction: column; max-height: 500px; overflow-y: auto; overflow-x: hidden; }
            #ibenhancerUSER-favorite-tags-list a { color: #8b1eb0; }
        `;
