/**
 * Module for managing documents, HTML documents (pure HTML or as a template) and 
 * generating PDFs from data (Json) if the template requires data.
 * @module html2pdf
 * @version 0.0.1
 * @license MIT 
 * @author jankstar
 * 
 */
const html2pdf = (() => {

    const ejs = require('ejs')
    const puppeteer = require('puppeteer');
    const fs = require('fs').promises;
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');

    /**
    * @property {Array} DOC_BUFFER Array of documents in memory
    * @property {String} DIRECTORY the directory used for files 
    * @property {Number} BUFFER the buffer for the EXEC 
    * @property {String} LANGU the language in ISO natation
    * @property {Array} STATUS Array of strings as Status
    */
    var DOC_BUFFER = [],        //Documents in local memory
        DIRECTORY = `${__dirname}/temp/`,   //Directory for temp data
        BUFFER = (1024 * 500),
        LANGU = 'en-UK',       //Language for converting
        STATUS = ['01_new']    //Document status info


    /**
     * Saves a base64 as a file;
     * generates a file name from uuid in temp directory if necessary 
     * @async
     * @param {String} iBase64 data from the binary file
     * @param {String} iFilename  Name of the file, if not given, then generated in temp
     * @returns {*} { filename, error } of the file
     */
    async function _base64ToFile(iBase64, iFilename) {
        try {
            if (!iBase64) { throw Error(`Base64 data must be provided.`) }
            let lFieldName = iFilename || DIRECTORY + uuidv4() + '.pdf'
            const buffDocument = Buffer.from(iBase64, 'base64');
            await fs.writeFile(lFieldName, buffDocument, 'binary');
            return { filename: lFieldName, error: undefined }
        } catch (err) {
            console.log(err)
            return { filename: undefined, error: err }
        }
    }

    /**
     * Creates a base64 string from a file
     * @async
     * @param {String} iFilename name of a file (binary)
     * @returns {String} base64 data from the file
     */
    async function _fileToBase64(iFilename) {
        let lData = undefined
        try {
            if (!iFilename) { throw Error(`No filename specified.`) }
            lData = await fs.readFile(iFilename, 'binary')
            const lBuff = Buffer.from(lData, 'binary')
            return lBuff.toString('base64');
        } catch (err) {
            console.log(err)
        }
        return undefined;
    }

    /**
    * Replaces variables from an HTML string
    * @param {Object} iVar  Variablen als json
    * @param {String} iData  HTML-Daten file
    * @returns {String} Return value as HTML data file
    */
    function _replaceVarInHTML(iVar, iData, iProtocol) {
        let rData = '';
        try {
            iVar = iVar || {};
            iProtocol = iProtocol || [];

            if (typeof iVar != 'object') {
                iVar = {}
                iProtocol.push("Error - iVar is not a object.")
            }

            rData = ejs.render(iData, iVar)


        } catch (err) {
            console.log(err);
            iProtocol.push(`Error: ${err.message}`)
        }
        return rData
    }

    /**
         * Class representing a document
         * @example
         * let lDoc = new Document({subject: 'test', filename:'test.pdf', type: 'PDF'})
         * 
         */
    class Document {

        /**
         * Create a document
         * @param {*} value is a structure of the fields of a document
         * id
         * date
         * subject
         * status
         * task
         * in_use
         * filename
         * file_extension
         * type
         * root_of
         * template
         * data
         * info
         * metadata
         * cathegory
         * langu
         * num_page
         * body
         * base64
         * protocol
         */
        constructor(value) {
            var now = new Date();
            value = value || {}
            this.id = value.id || uuidv4()
            this.date = value.date || now.toISOString()
            this.subject = value.subject || ""
            this.status = value.status || STATUS[0]
            this.task = value.task || "create"
            this.in_use = value.in_use || "completed"
            this.filename = value.filename || ""
            this.file_extension = path.extname(this.filename.toLowerCase()) || ""
            this.type = value.type || ""
            if (!this.type) {
                this.type = this.file_extension.replaceAll(/\./g, '') //clear all points
            }
            this.type = this.type.toUpperCase()
            this.root_of = value.root_of || ""
            this.template = value.template || ""
            this.data = value.data || {}
            this.info = value.info || {}
            this.metadata = value.metadata || {}
            this.category = value.category || []
            this.inputpath = value.inputpath || ""
            this.langu = value.langu || "de-DE"
            this.num_pages = value.num_pages || 0
            this.format = value.format || 'A4'
            this.landscape = value.landscape || false
            this.body = value.body || ""
            this.base64 = value.base64 || ""
            //
            this.protocol = []
            this.is_file = false || (this.filename != '');
        }

        setValue(value) {
            value = value || {}
            this.id = value.id || this.id
            this.date = value.date || this.date
            this.subject = value.subject || this.subject
            this.status = value.status || this.status
            this.task = value.task || this.task
            this.in_use = value.in_use || this.in_use
            this.filename = value.filename || this.filename
            this.type = value.type || this.type
            this.type = this.type.toUpperCase()
            this.root_of = value.root_of || this.root_of
            this.template = value.template || this.template
            this.data = value.data || this.data
            this.info = value.info || this.info
            this.metadata = value.metadata || this.metadata
            this.category = value.category || this.category
            this.inputpath = value.inputpath || this.inputpath
            this.langu = value.langu || this.langu
            this.num_pages = value.num_pages || this.num_pages
            this.format = value.format || this.format
            this.landscape = value.landscape || this.landscape           
            this.body = value.body || this.body
            this.base64 = value.base64 || this.base64
            this.is_file = false || (this.filename != '');
        }

        /**
     * Checks in the document, i.e., the file in filename becomes a base64 and the file is deleted
     * @async
     * @param {Boolean} iNotDel if set, the file is not deleted
     */
        async checkIn(iNotDel) {
            try {
                if (!this.type) { throw Error(`Type of document not defined.`) }
                if (!this.base64) {
                    if (!this.filename) { throw Error(`CheckIn requires either base64 or a file (filename).`) }
                    this.base64 = await _fileToBase64(this.filename)
                }
                if (!iNotDel && this.filename) {
                    fs.rm(this.filename)
                }
            } catch (err) {
                console.log(err)
                this.protocol.push(`Error: ${err.message}`)
            }
        }

        /**
        * Checks out the document, i.e. a file is created from the base64 in filename
        * @async
        */
        async checkOut() {
            let { filename: lFilename, error: err } = await _base64ToFile(this.base64, this.filename)
            if (err) {
                console.log(err)
                this.protocol.push(`Error: ${err.message}`)
            } else {
                this.filename = lFilename
            }
        }

        /**
         * @param {Boolean} iReWrite true -> rewrite the template 
         * @returns true/false 
         */
        isTemplate(iReWrite) {
            try {
                if (!this.template) throw Error("No template name found.")
                if (this.type != 'HTML') throw Error(`Wrong type ${this.type}`)
                if (!this.subject) throw Error("Subject is missing.")
                let newTemplate = html2pdf.findDocBySubject(this.subject, this.type, this.template)
                if (newTemplate) {
                    if (!iReWrite) throw Error(`There is already a template with this name ${this.template}.`)
                    newTemplate = this;
                } else {
                    DOC_BUFFER.push(this)
                    this.protocol.push("Document saved as template.")
                }
                return true;
            } catch (err) {
                console.log(err)
                this.protocol.push(`Error: ${err.message}`)
                return false;
            }
        }
    }


    return {

        Document,


        /**
         * Sets the module variables DIRECTORY, BUFFER, LANGU, STATUS[]
         * @param {Object} iValue as {DIRECTORY,BUFFER,LANGU,STATUS}
         */
        setConfig(iValue) {
            let lValue = iValue || {}
            DIRECTORY = lValue.DIRECTORY || DIRECTORY;
            BUFFER = lValue.BUFFER || BUFFER
            LANGU = lValue.LANGU || LANGU
            STATUS = lValue.STATUS || STATUS
        },

        /**
         * Saves a base64 as a file;
         * generates a file name from uuid in temp directory if necessary 
         * @async
         * @param {String} iBase64 data from the binary file
         * @param {String} iFilename  Name of the file, if not given, then generated in temp
         * @returns {*} { filename, error } of the file
         */
        base64ToFile: _base64ToFile,

        /**
         * Creates a base64 string from a file
         * @async
         * @param {String} iFilename name of a file (binary)
         * @returns {String} base64 data from the file
         */
        fileToBase64: _fileToBase64,

        /**
         * Returns a document for a name and a type (optional)
         * @param {String} iSubject 
         * @param {String} iType optional
         * @param {String} iTemplate optional
         * @returns {Document}
         */
        findDocBySubject(iSubject, iType, iTemplate) {
            for (let index = 0; index < DOC_BUFFER.length; index++) {
                if (iType && iTemplate) {
                    if (DOC_BUFFER[index].subject == iSubject
                        && DOC_BUFFER[index].type == iType
                        && DOC_BUFFER[index].template == iTemplate) {
                        return new Document(DOC_BUFFER[index]);
                    }
                } else {
                    if (iType) {
                        if (DOC_BUFFER[index].subject == iSubject && DOC_BUFFER[index].type == iType) {
                            return new Document(DOC_BUFFER[index]);
                        }
                    } else {
                        if (iTemplate) {
                            if (DOC_BUFFER[index].subject == iSubject
                                && DOC_BUFFER[index].template == iTemplate) {
                                return new Document(DOC_BUFFER[index]);
                            }
                        } else {
                            if (DOC_BUFFER[index].subject == iSubject) {
                                return new Document(DOC_BUFFER[index]);
                            }
                        }
                    }
                }
            }
            return undefined
        },


        /**
         * Supplies the data for a template by name (template) as Document or error
         * @param {String} iName Template name
         * @returns {*} object { doc: Document, error: err}  
         */
        async getTemplate(iName) {
            let lDoc = undefined;
            try {
                lDoc = html2pdf.findDocBySubject(iName, 'HTML', iName)
                if (!lDoc) { throw Error(`Template ${iName} not found.`) }
                if (!lDoc.body) {
                    if (!lDoc.filename) { throw Error(`Template ${iName} cannot be loaded.`) }
                    lDoc.body = await fs.readFile(lDoc.filename, 'utf-8');
                }
                return { doc: lDoc, error: undefined };
            } catch (err) {
                return { doc: undefined, error: err }
            }
        },


        /**
        * Defines a template and writes it to the buffer array
        * @param {String} iName 
        * @param {String} iFileName 
        * @returns {Document} Template
        */
        newTemplateByFile(iName, iFileName) {
            try {
                let lDoc = new Document({ subject: iName, template: iName, filename: iFileName, task: 'HTML_from_File' });
                lDoc.protocol.push(`Start 'newTemplateByFile' with name ${iName}`)
                if (!lDoc.subject) { throw Error(`The name of the template or the subject must be specified.`) }
                if (!iFileName) { throw Error(`A file name must be specified.`) }
                if (path.extname(iFileName.toLowerCase()) != '.html') { throw Error(`The filename must be HTML for a template.`) }
                lDoc.type = 'HTML'

                let newTemplate = html2pdf.findDocBySubject(lDoc.subject, lDoc.type, lDoc.template)
                if (newTemplate) {
                    throw Error(`There is already a template with this name ${iName}.`)
                } else {
                    DOC_BUFFER.push(lDoc)
                }
                return lDoc;
            } catch (err) {
                this.protocol.push(`Error: ${err.message}`);
                return undefined;
            }
        },



        /**
         * Generates a document (correspondence) for a template with specified data.
         * @async
         * @param {*} iTemplate Template used 
         * @param {*} iVar Variables for replacement in the template json structure
         * @returns {Document} returns a document with the RFT in the body
         */
        async createDocAsCorrespondence(iTemplate, iVar) {
            let lDoc = new Document({ subject: `Correspondence of template ${iTemplate}`, template: iTemplate, task: 'Create_Correspondence' });
            lDoc.protocol.push(`Start 'createDocAsCorrespondence' with template ${iTemplate}`)
            try {
                let { doc: lTemplate, error: err } = await this.getTemplate(iTemplate);
                if (err || !lTemplate || !lTemplate.body) {
                    err = err || {}
                    err.message = err.message || 'No template data found'
                    console.log(err)
                    lDoc.protocol.push(`Error: ${err.message}`)
                    return lDoc;
                }

                //Replace fields
                lDoc.body = _replaceVarInHTML(iVar, lTemplate.body, lDoc.protocol);
                lDoc.format = lTemplate.format || 'A4'
                lDoc.landscape = lTemplate.landscape || false
                lDoc.protocol.push(`Correspondence created.`)
                lDoc.type = 'HTML';
                return lDoc;

            } catch (err) {
                err.message = err.message || err;
                console.log(err.message)
                lDoc.protocol.push(`Error: ${err.message}`)
                return lDoc;
            }
        },

        /**
         * Converts HTML to PDF and delivers row data (string as binary)
         * @async
         * @param {String} iData as HTML
         * @param {String} iFromat i.e A4
         * @param {Boolean} iLandscape true / false
         * @returns {Object} { data , html_filename , pdf_filename ,error } data is PDF as string in raw data (binary)
         * 
         */
        async convertHTMLToPDFByData(iData, iFormat, iLandscape, iNotDel) {
            try {
                let lFormat = iFormat || 'A4'
                let lLandscape = iLandscape || false
                let lFileName = uuidv4();
                await fs.writeFile(`${DIRECTORY}${lFileName}.html`, iData, 'utf8');
                //todo html -> pdf generieren

                await (async () => {
                    const lUrl = `file://${DIRECTORY}${lFileName}.html` //`${req.protocol}://${req.rawHeaders[1]}`
                    const browser = await puppeteer.launch();
                    const page = await browser.newPage();
                    //for (ele in req.cookies) {
                    //    await page.setCookie({ name: ele, value: req.cookies[ele], url:lUrl+'/' })
                    //}

                    await page.goto(lUrl, { waitUntil: 'networkidle2' });
                    await page.pdf({ path: `${DIRECTORY}${lFileName}.pdf`, format: lFormat, landscape: lLandscape });

                    await browser.close();
                })();


                let lData = await fs.readFile(`${DIRECTORY}${lFileName}.pdf`, 'binary');
                if (!iNotDel) {
                    fs.rm(`${DIRECTORY}${lFileName}.html`);
                    fs.rm(`${DIRECTORY}${lFileName}.pdf`);
                    return { data: lData, html_filename: '', pdf_filename: '', error: undefined }
                }
                return { data: lData, html_filename: `${DIRECTORY}${lFileName}.html`, pdf_filename: `${DIRECTORY}${lFileName}.pdf`, error: undefined }
            } catch (err) {
                return { data: undefined, html_filename: '', pdf_filename: '', error: err }
            }
        },

        /**
        * Generates a PDF file from an HTML file
        * @async
        * @param {Document} iDoc RDF document
        * @param {Boolean} iNotDel if 'true', the temporary files for the HTML and PDF document are not deleted but returned
        * @returns {Document} a new document as PDF
        */
        async convertHTMLToPDF(iDoc, iNotDel) {
            let lNewDoc = new Document({ subject: iDoc.subject, template: iDoc.template, task: 'HTML_to_PDF' });
            lNewDoc.protocol = lNewDoc.protocol.concat(iDoc.protocol)
            lNewDoc.protocol.push(`Start 'convertHTMLToPDF' with subject '${iDoc.subject}'`)
            try {
                if (!iDoc.body) { throw Error(`Document has an HTML body.`) }
                if (iDoc.type != 'HTML') { throw Error(`Document is not of type HTML`) }
                let { data: lData,
                    html_filename: lHTMLFilename,
                    pdf_filename:
                    lPDFFilename,
                    error: err } = await html2pdf.convertHTMLToPDFByData(iDoc.body, iDoc.format, iDoc.landscape, iNotDel)
                if (err) { throw err }
                iDoc.filename = lHTMLFilename

                const lBuff = Buffer.from(lData, 'binary')
                lNewDoc.base64 = lBuff.toString('base64');
                lNewDoc.filename = lPDFFilename;
                lNewDoc.type = 'PDF';
                lNewDoc.checkIn(iNotDel);

            } catch (err) {
                console.log(err)
                lNewDoc.protocol.push(`Error: ${err.message}`)
            }
            return lNewDoc;
        },

        /**
        * Test routine generates a PDF from test/Brief1.html
        * and test data a PDF
        * and a text body from a test PDF file.
        * @async
        */
        async test() {

            //Regsitrate new HTML template 
            let lDoc1 = html2pdf.newTemplateByFile('test', `${__dirname}/test/Brief1.html`);
            lDoc1.format = 'A4'
            lDoc1.landscape = false
            if (lDoc1 && lDoc1.filename) {
                console.log(`\nHTML Template file ${lDoc1.filename} found.`)
            } else {
                if (lDoc1) {
                    console.log(lDoc1.protocol)
                } else {
                    console.log(`HTML Template document not found.`)
                }
                return;
            }

            //Create a correspondence as a new document for an HTML template 
            let lDoc2 = await html2pdf.createDocAsCorrespondence('test',
                {
                    "name": {
                        "vorname": "Hans-Joachim",
                        "nachname": "L??denscheid",
                        "strasse": "An der gro??en Br??cke",
                        "hnr": "192a",
                        "telnr": "+49 151 99886677",
                        "email": "hjo.luedie@mac.com"
                    },
                    "to": {
                        "titel": "Herr",
                        "name1": "Hans M??ller",
                        "strasse": "Unter den Eichen",
                        "hnr": "142",
                        "plz": "14163",
                        "ort": "Berlin",
                        "anrede": "Sehr geehrter Herr M??ller"
                    },
                    "leistung": [
                        { "nr": 100, "bezeichnung": "Haseln??sse", "preis": 4.50 },
                        { "nr": 101, "bezeichnung": "Sonderzeichen ?????????????????", "preis": 6.75 }
                    ],
                    "auftrag": {
                        "datum": new Date()
                    }
                }
            )

            //Generate a PDF document from HTML document
            if (lDoc2 && lDoc2.body) {
                console.log(`\nHTML document subject ${lDoc2.subject} created.\n`)
                lDoc2.protocol.forEach((text) => {
                    console.log('** ' + text)
                })
                let lDoc3 = await html2pdf.convertHTMLToPDF(lDoc2, true)
                if (lDoc3 && lDoc3.filename) {
                    console.log(`\nPDF document ${lDoc3.filename} created.\n`)

                    lDoc2.checkIn() //<-- delete temp file 
                    lDoc3.checkIn() //<-- delete temp file
                } else {
                    if (lDoc3) {
                        console.log(lDoc3.protocol)
                    } else {
                        console.log(`PDF document not created.`)
                    }
                }

            } else {
                if (lDoc2) {
                    console.log(lDoc2.protocol)
                } else {
                    console.log(`HTML document not created.`)
                }
            }

        }
    }
})();

module.exports = {
    html2pdf
}