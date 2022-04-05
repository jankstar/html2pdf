# html2pdf Module
This module provides the following functions:

## 1. Documents
Management of documents in a class, with the following attributes:
```
{id, date, subject, status, task, in_use, filename, file_extension, type, template, data, info, metadata, cathegory[String], langu, num_page, body, base64, protocol[String] }
```
langu - the ISO notation of the language, e.g. 'de-DE' or 'en-UK'.

### 1.1 new Dokument()
Define a new document as a PDF; the filename references a file:
```
    //Create a PDF document
    let lDoc4 = new Document({ subject: "test PDF to Text", type: "PDF", filename: "test/Rechnung1.PDF", langu: 'de-DE' })
```

### 1.2 checkIn() / checkOut()
The file is converted to base64 - the parameter controls whether the file is not deleted.
"checkIn()" deletes the local file if necessary and creates a base64 element in the documnet. Now the document can be transferred e.g. via service or saved as Json.
```
    lDoc4.checkIn(true);
```
The "checkOut()" again creates a local file from the base64.

local file --> "checkIn()" --> base64 --> "checkOut()" --> local file 


### 1.3 newTemplateByFile
A template is an HTML document and can be created from an HTML file.
The template is stored in an internal memory.
```
    //Regsitrate new HTML template by file
    let lDoc1 = html2pdf.newTemplateByFile('test', 'test/Brief1.html');
    if (lDoc1 && lDoc1.filename) {
        console.log(`\nHTML Template file ${lDoc1.filename} found.`)
    } else {
        if (lDoc1) {
            console.log(lDoc1.protocol)
        } else {
            console.log(`HTML Template document not found.`)
        }
    }
```

### 1.4 createDocAsCorrespondence
Correspondences can then be created with the template. For this purpose, the data that is to be replaced in the variables of the template is provided.
```
    //Create a correspondence as a new document for an HTML template 
    let lDoc2 = await html2pdf.createDocAsCorrespondence('de-DE', 'test',
        {
            "name": {
                "vorname": "Hans-Joachim",
                "nachname": "Lüdenscheid",
                "strasse": "An der großen Brücke",
                "hnr": "192a",
                "telnr": "+49 151 99886677",
                "email": "hjo.luedie@mac.com"
            },
            "to": {
                "titel": "Herr",
                "name1": "Hans Müller",
                "strasse": "Unter den Eichen",
                "hnr": "142",
                "plz": "14163",
                "ort": "Berlin",
                "anrede": "Sehr geehrter Herr Müller"
            },
            "leistung": [
                { "nr": 100, "bezeichnung": "Haselnüsse", "preis": 4.50 },
                { "nr": 101, "bezeichnung": "Sonderzeichen €¢¥£µ©®§", "preis": 6.75 }
            ],
            "auftrag": {
                "datum": new Date()
            }
        }
    )
```

### 1.5 Variables in HTML template
The variables in the HTML template must have the notation from ejs-library
https://ejs.co/

example field:
```
<%= to.titel %>
```

example table:
```
    <table>
        <tbody>
            <tr>
                <th style="width: 20mm;">Nr.</th>
                <th>Bezeichnung</th>
                <th style="text-align: right;">netto Preis</th>
            </tr>
            <% leistung.forEach(function(leistung) { %>
                <tr>
                    <td><%= leistung.nr %></td>
                    <td><%= leistung.bezeichnung %></td>
                    <td style="text-align: right;"><%= leistung.preis.toLocaleString('de-DE') %> EUR </td>
                </tr>
                <% }); %>
        </tbody>
    </table>
```
## 2. Template and correspondences
- Save HTML template as documents in memory
- create an HTML correspondence from a template and data (Json)
- create a PDF from an HTML file (via pagedjs library )
- convert the file from/to base64 

## 4 Example
```
    //Regsitrate new HTML template 
    let lDoc1 = html2pdf.newTemplateByFile('test', `${__dirname}/test/Brief1.html`);
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
    let lDoc2 = await html2pdf.createDocAsCorrespondence('de-DE', 'test',
        {
            "name": {
                "vorname": "Hans-Joachim",
                "nachname": "Lüdenscheid",
                "strasse": "An der großen Brücke",
                "hnr": "192a",
                "telnr": "+49 151 99886677",
                "email": "hjo.luedie@mac.com"
            },
            "to": {
                "titel": "Herr",
                "name1": "Hans Müller",
                "strasse": "Unter den Eichen",
                "hnr": "142",
                "plz": "14163",
                "ort": "Berlin",
                "anrede": "Sehr geehrter Herr Müller"
            },
            "leistung": [
                { "nr": 100, "bezeichnung": "Haselnüsse", "preis": 4.50 },
                { "nr": 101, "bezeichnung": "Sonderzeichen €¢¥£µ©®§", "preis": 6.75 }
            ],
            "auftrag": {
                "datum": new Date()
            }
        })

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

```
 