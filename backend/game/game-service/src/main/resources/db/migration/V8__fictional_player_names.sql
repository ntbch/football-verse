WITH names AS (
    SELECT ARRAY[
        'Mateo','Lucas','Noah','Ethan','Liam','Milan','Theo','Nico','Leo',
        'Rafael','Jonas','Adrian','Kai','Owen','Felix','Ibrahim','Marco','Dario'
    ] AS first_names,
    ARRAY[
        'Silva','Moreau','Reed','Kovac','Bennett','Santos','Novak','Hayes','Costa',
        'Mercer','Larsen','Diallo','Rossi','Ward','Fischer','Almeida','Stone','Marin'
    ] AS last_names
),
numbered AS (
    SELECT p.id, row_number() OVER (PARTITION BY p.club_id ORDER BY p.name) - 1 AS index,
           length(c.name) AS offset
    FROM players p
    JOIN clubs c ON c.id = p.club_id
    WHERE p.name = c.name || ' Player ' || substring(p.name FROM '[0-9]+$')
)
UPDATE players p
SET name = names.first_names[((numbered.index + numbered.offset) % array_length(names.first_names, 1)) + 1]
    || ' ' ||
    names.last_names[((numbered.index * 3 + numbered.offset) % array_length(names.last_names, 1)) + 1]
FROM numbered, names
WHERE p.id = numbered.id;
