
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../../css/mainlayout.module.css';


export default function AccordionMenu({ item, handleLinkClick }) {
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);


    const toggleAccordion = (e) => {
        e.preventDefault();
        setIsAccordionOpen(prev => !prev);
    };


    const onSubLinkClick = () => {

        handleLinkClick();
    };

    return (
        <div className={styles.accordionItem}>

            <a
                href="#"
                onClick={toggleAccordion}
                className={`${styles.navLink} ${styles.accordionButton} ${isAccordionOpen ? styles.isOpen : ''}`}
            >
                <i className={item.icon}></i>
                <span>{item.label}</span>
                <i className={`fas fa-chevron-right ${styles.accordionIcon} ${isAccordionOpen ? styles.isOpen : ''}`}></i>
            </a>

            <div className={`${styles.accordionContent} ${isAccordionOpen ? styles.isOpen : ''}`}>
                {item.links.map(subLink => (
                    <NavLink
                        key={subLink.to}
                        to={subLink.to}
                        onClick={onSubLinkClick}

                        className={({ isActive }) => `${styles.navLink} ${styles.subLink} ${isActive ? styles.activeLink : ''}`}
                    >
                        <i className={subLink.icon}></i>
                        <span>{subLink.label}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
}