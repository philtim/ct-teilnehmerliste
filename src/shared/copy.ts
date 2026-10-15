/**
 * Every piece of text the extension shows, in one place — German only, so a
 * translation or a wording change is a one-file change. Components name a
 * key; they do not carry text of their own.
 *
 * The column labels double as the Excel headers, so preview and file always
 * agree. Not in here: the rest of the Excel file's own content
 * (members/workbook.ts), which is a document of its own, and console
 * messages, which nobody using the extension reads.
 */
const people = (n: number) => `${n} ${n === 1 ? 'Person' : 'Personen'}`;

/** ChurchTools' membership statuses. An unknown one is shown as ChurchTools names it. */
const MEMBER_STATUS: Record<string, string> = {
    active: 'aktiv',
    requested: 'angefragt',
    waiting: 'Warteliste',
    to_delete: 'zu löschen',
};

export const COPY = {
    appTitle: 'Teilnehmerliste',
    appIntro:
        'Gruppe wählen, Mitglieder nach Familien zusammengefasst ansehen, Spalten ' +
        'auswählen und als Excel herunterladen. Angezeigt wird nur, was du in ' +
        'ChurchTools sehen darfst.',
    footer: (version: string, commit: string) => `Teilnehmerliste ${version} · ${commit}`,

    // Group picker
    pickerTitle: 'Gruppe wählen',
    searchLabel: 'Name, ID oder Link der Gruppe',
    searchPlaceholder: 'z. B. Sommerfreizeit oder https://…/groups/123',
    typeLabel: 'Gruppentyp',
    typeAll: 'Alle Gruppentypen',
    searchHint: 'Gib einen Namen ein oder wähle einen Gruppentyp.',
    searching: 'Suche …',
    searchFailed: 'Die Suche ist fehlgeschlagen. Bitte noch einmal versuchen.',
    searchNoHits: 'Keine Gruppe gefunden, die du sehen darfst.',
    searchHits: (n: number) => (n === 1 ? '1 Gruppe gefunden.' : `${n} Gruppen gefunden.`),
    searchMoreHits: (shown: number, total: number) =>
        `${total} Gruppen gefunden, die ersten ${shown} werden gezeigt.`,
    searchNarrow: ' Bitte die Suche eingrenzen.',

    // The chosen group
    chosenGroup: 'Gewählte Gruppe',
    changeGroup: 'Andere Gruppe wählen',
    openGroupInNewTab: (name: string) => `${name} in ChurchTools öffnen (neuer Tab)`,
    /** Starts with the visible id, so speech input can name the link (WCAG 2.5.3). */
    openProfileById: (id: number, name: string) =>
        `${id}: Profil von ${name || 'dieser Person'} öffnen (neuer Tab)`,
    loadingGroup: 'Mitglieder, Personendaten und Beziehungen werden geladen …',
    loadError: {
        notFound: 'Diese Gruppe gibt es nicht, oder du darfst sie nicht sehen.',
        forbidden: 'Du darfst die Mitglieder dieser Gruppe nicht sehen.',
        failed: 'Die Gruppe konnte nicht geladen werden.',
    },
    retry: 'Erneut versuchen',
    noMembers: 'Diese Gruppe hat keine Mitglieder, die du sehen darfst.',
    allFiltered: 'Mit dieser Status-Auswahl ist niemand auf der Liste.',

    // Summary and download
    statPeople: 'Personen',
    statFamilies: 'Familien',
    statMultiFamilies: 'davon mit mehreren Personen',
    statMultiDetail: (n: number) => `(${people(n)})`,
    download: 'Excel herunterladen',
    downloading: 'Wird erstellt …',
    downloadFailed: 'Die Excel-Datei konnte nicht erstellt werden. Bitte noch einmal versuchen.',
    noColumns: 'Bitte mindestens eine Spalte auswählen.',

    // Hints about the data
    hintsTitle: 'Hinweise zu den Daten',
    relationshipProblem: {
        unreadable:
            'Die Beziehungen aus ChurchTools konnten nicht gelesen werden. Familien sind ' +
            'deshalb nur an gleicher Adresse und gleichem Nachnamen erkannt.',
        noParentChildType:
            'In ChurchTools gibt es keine Beziehungsart „Elternteil/Kind“. Geschwister ' +
            'werden deshalb nur über Adresse, Nachname oder eine Geschwister-Beziehung erkannt.',
    },
    hintGroupFieldsUnreadable:
        'Die Felder dieser Gruppe konnten nicht gelesen werden – vielleicht fehlt dir das ' +
        'Recht dazu. Ihre Spalten fehlen deshalb in der Liste.',
    hintPersonFieldsUnreadable:
        'Die Personenfelder von ChurchTools konnten nicht gelesen werden. Weitere ' +
        'Personenfelder stehen deshalb nicht zur Auswahl.',
    hintNotLoaded: (n: number) =>
        `Von ${people(n)} darfst du nur den Namen sehen. Sie stehen ohne Adresse und ` +
        'weitere Daten auf der Liste, jede als eigene Familie, wenn keine Beziehung sie verbindet.',
    hintWithoutAddress: (n: number) =>
        `${people(n)} ohne Straße in ChurchTools. Ihre Familie ist nur über hinterlegte ` +
        'Beziehungen erkannt.',

    // Status filter
    statusFilter: 'Status:',
    memberStatus: (status: string) => MEMBER_STATUS[status] ?? status,
    excludedStatus: (label: string, n: number) => `${label}: ${people(n)}`,

    // Columns
    columnsTitle: (on: number, all: number) => `Spalten (${on} von ${all} ausgewählt)`,
    sectionTitle: {
        person: 'Person',
        membership: 'Mitgliedschaft',
        group: 'Felder dieser Gruppe',
        personExtra: 'Weitere Personenfelder',
        family: 'Familie',
    },
    sectionCount: (on: number, all: number) => `${on}/${all}`,
    selectAll: 'alle',
    selectNone: 'keine',
    personExtraNote: 'Nur Felder, die ChurchTools dir für diese Personen liefert.',
    resetColumns: 'Standardauswahl wiederherstellen',
    saveState: {
        idle: '',
        saving: 'Auswahl wird gespeichert …',
        saved: 'Auswahl für diese Gruppe gespeichert.',
        failed: 'Auswahl konnte nicht gespeichert werden und gilt nur bis zum Schließen der Seite.',
    },
    colId: 'ID',
    colLastName: 'Nachname',
    colFirstName: 'Vorname',
    colStreet: 'Straße',
    colZip: 'PLZ',
    colCity: 'Ort',
    colEmails: 'E-Mail',
    colEmailN: (n: number, of: number) => (of === 1 ? 'E-Mail' : `E-Mail ${n}`),
    colRole: 'Rolle',
    colStatus: 'Status',
    colSince: 'Eintrittsdatum',
    colComment: 'Kommentar',
    colFamily: 'Familien-ID',
    yes: 'ja',
    no: 'nein',
    /** ChurchTools' built-in option keys that no masterdata list translates. */
    builtInLabel: {
        'familystatus.unknown': 'unbekannt',
        'familystatus.single': 'ledig',
        'familystatus.married': 'verheiratet',
        'familystatus.divorced': 'geschieden',
        'familystatus.widowed': 'verwitwet',
        'familystatus.separated': 'getrennt lebend',
        'familystatus.partnership': 'eingetragene Partnerschaft',
    } as Record<string, string>,

    // Preview
    previewCaption: (group: string) => `Vorschau der Liste für ${group}`,
    previewTruncated: (shown: number, total: number) =>
        `Die Vorschau zeigt die ersten ${shown} von ${total} Zeilen; die Excel-Datei enthält alle.`,
    previewShowAll: 'Alle anzeigen',

    listTruncated: (url: string, max: number) =>
        `${url} liefert mehr als ${max} Einträge — die Liste wäre unvollständig.`,
};
