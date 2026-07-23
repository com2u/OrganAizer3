ALTER TABLE personen ADD COLUMN IF NOT EXISTS standort TEXT;

CREATE TABLE IF NOT EXISTS rolle_gruppen (
    rolle_id INTEGER NOT NULL REFERENCES rollen(id) ON DELETE CASCADE,
    usergruppe TEXT NOT NULL REFERENCES usergruppen(nummer) ON DELETE CASCADE,
    PRIMARY KEY (rolle_id, usergruppe)
);

CREATE TABLE IF NOT EXISTS termin_raeume (
    bespr_nr INTEGER NOT NULL REFERENCES termine(bespr_nr) ON DELETE CASCADE,
    raum_id INTEGER NOT NULL REFERENCES raeume(id) ON DELETE CASCADE,
    PRIMARY KEY (bespr_nr, raum_id)
);

CREATE TABLE IF NOT EXISTS termin_komponenten (
    bespr_nr INTEGER NOT NULL REFERENCES termine(bespr_nr) ON DELETE CASCADE,
    komponente_id INTEGER NOT NULL REFERENCES komponenten(id) ON DELETE CASCADE,
    PRIMARY KEY (bespr_nr, komponente_id)
);
