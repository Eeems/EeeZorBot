/* jshint multistr: true */
/* global log db */
/* eslint no-multi-str: 0 */
// Make sure database is set up. Create tables if missing
// and create indexes if missing
log.debug(' |  |  |- Setting up database');
db.multiQuerySync([
    '\
        CREATE TABLE IF NOT EXISTS types (\
            id int AUTO_INCREMENT PRIMARY KEY,\
            name varchar(10) UNIQUE KEY NOT NULL\
        )\
        CHARACTER SET utf8\
        COLLATE utf8_general_ci\
    ',
    '\
        CREATE TABLE IF NOT EXISTS users (\
            id int AUTO_INCREMENT PRIMARY KEY,\
            name varchar(30) UNIQUE KEY NOT NULL\
        )\
        CHARACTER SET utf8\
        COLLATE utf8_general_ci\
    ',
    '\
        CREATE TABLE IF NOT EXISTS servers (\
            id int AUTO_INCREMENT PRIMARY KEY,\
            name varchar(63) UNIQUE KEY NOT NULL,\
            host varchar(400),\
            port int\
        )\
        CHARACTER SET utf8\
        COLLATE utf8_general_ci\
    ',
    '\
        CREATE TABLE IF NOT EXISTS channels (\
            id int AUTO_INCREMENT PRIMARY KEY,\
            s_id int,\
            name varchar(50) NOT NULL,\
            INDEX i_channels_s_id(s_id),\
            FOREIGN KEY(s_id)\
                REFERENCES servers(id)\
                ON DELETE CASCADE\
                ON UPDATE CASCADE\
        )\
        CHARACTER SET utf8\
        COLLATE utf8_general_ci\
    ',
    '\
        CREATE TABLE IF NOT EXISTS messages (\
            id int AUTO_INCREMENT PRIMARY KEY,\
            date timestamp DEFAULT CURRENT_TIMESTAMP,\
            t_id int,\
            c_id int,\
            u_id int,\
            text varchar(512),\
            FULLTEXT i_logs_text (text),\
            INDEX i_logs_t_id(t_id),\
            INDEX i_logs_c_id(c_id),\
            INDEX i_logs_u_id(u_id),\
            INDEX i_logs_all_id(date, c_id, u_id, t_id),\
            FOREIGN KEY (t_id)\
                REFERENCES types(id)\
                ON DELETE RESTRICT\
                ON UPDATE CASCADE,\
            FOREIGN KEY (c_id)\
                REFERENCES channels(id)\
                ON DELETE CASCADE\
                ON UPDATE CASCADE,\
            FOREIGN KEY (u_id)\
                REFERENCES users(id)\
                ON DELETE RESTRICT\
                ON UPDATE CASCADE\
        )\
        CHARACTER SET utf8\
        COLLATE utf8_general_ci\
    ',
    '\
        CREATE OR REPLACE VIEW messages_v AS\
            SELECT  m.id,\
                    s.name AS server,\
                    c.name AS channel,\
                    u.name AS user,\
                    t.name AS type,\
                    m.text,\
                    m.date\
            FROM messages m\
            JOIN channels c\
                ON c.id = m.c_id\
            JOIN servers s\
                ON s.id = c.s_id\
            JOIN users u\
                ON u.id = m.u_id\
            JOIN types t\
                ON t.id = m.t_id\
            ORDER BY m.date ASC, m.id ASC\
    '
]);
