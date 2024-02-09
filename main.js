// console.log("Hello to electron");
const path = require('path');
const os = require('os');
const fs = require('fs')
const resizeImg = require('resize-img');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')

process.env.NODE_ENV = 'production';

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
//Create the Main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Image Resizer',
        width: isDev ? 1000 : 600,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    //open devtools if in dev mode
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

//Create the About window
function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        width: 300,
        height: 300
    });
    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

//App is ready
app.whenReady().then(() => {
    createMainWindow();

    //Implement Menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    //Remove mainWindow from  memory on close
    mainWindow.on('closed', ()=>(mainWindow=null));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    });
});

//Menu template
const menu = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label: 'About',
                click: createAboutWindow,
            },
        ],
    }] : []),
    {
        // label: 'File',
        // submenu: [
        //     {
        //         label: 'Quit',
        //         click: () => app.quit(),
        //         accelarator: 'CmdOrCtrl+W',
        //     }
        // ]
        role: 'fileMenu',
    },
    ...(!isMac ? [{
        label: 'Help',
        submenu: [{
            label: 'About1',
            click: createAboutWindow,
        }]
    }] : []),
]


//Respond to ipcRenderer resize
ipcMain.on('image:resize', (e, options) => {
    options.dest = path.join(os.homedir(), 'imageResizer')
    resizeImage(options);
})

//Resize the image
async function resizeImage({ imgPath, width, height, dest }) {
    try {
        const newPath = await resizeImg(fs.readFileSync(imgPath), {
            width: +width,
            height: +height,
        })

        //Create filename
        const filename = path.basename(imgPath);

        //Create dest folder if not exist
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }

        //Write file to dest
        fs.writeFileSync(path.join(dest, filename), newPath);

        //Send Success to render
        mainWindow.webContents.send('image:done')

        //OPen dest folder
        shell.openPath(dest);
    } catch (error) {
        console.log(error);
    }

}
app.on('window-all-closed', () => {
    if (!isMac) app.quit()
})