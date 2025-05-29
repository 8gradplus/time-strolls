--- Place test data
INSERT INTO timestrolls.place (name, type, lat, lon)
VALUES
    ('Unterurasch', 'Place', 48.61017854015886, 14.04406485511563),
    ('Sankt Thoma', 'Place', 48.645228734293525, 14.10324739758884),
    ('Dorfkapelle Oberuresch', 'Chapel', 48.6113, 14.06166);

-- Podcast test data
INSERT INTO timestrolls.podcast (title, url, place_id)
VALUES
    (
        'A random title',
        'https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/podcasts/test.mp3',
        1
    ),
    (
        'GAG83: 100 Jahre vor der Reformation – Jan Hus und die Hussitenkriege',
        'https://audio.podigee-cdn.net/543211-m-64d99e1b9312e44e27a75be845df3628.mp3?source=webplayer',
        2
    );

-- Image test data
INSERT INTO timestrolls.image (url, path, title, place_id)
VALUES
    (
        'https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file430410.webp',
        'test/timestrolls/images/file430410.webp',
        'Sonntags Spaziergang',
        1
    ),
    (
        'https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546065.webp',
        'test/timestrolls/images/file546065.webp',
        NULL,
        1
    ),
    (
        'https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546072.webp',
        'test/timestrolls/images/file546072.webp',
        NULL,
        1
    ),
    (
        'https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546074.webp',
        'test/timestrolls/images/file546074.webp',
        NULL,
        1
    ),
    (
        'https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file564226.webp',
        'test/timestrolls/images/file564226.webp',
        NULL,
        1
    ),
    (
        'https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file840955.webp',
        'test/timestrolls/images/file840955.webp',
        NULL,
        1
    );
