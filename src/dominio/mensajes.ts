import { DIAS } from "../constantes";

/**
 * Mensajes que ve la clienta al cerrar un entrenamiento.
 *
 * Cortos a propósito: aparecen sobre una pantalla en la que acaba de terminar
 * de entrenar, cansada y con el móvil en la mano.
 */
export const MENSAJES_DIA = [
    "¡Lo hiciste! 💜 Me alegra mucho verte cumplir con tu rutina y seguir trabajando por ti.",
    "Rutina terminada 💪✨ Estoy muy orgullosa de tu esfuerzo y de la constancia que estás construyendo.",
    "¡Muy bien hecho! 💜 Gracias por darte este espacio para cuidarte, fortalecerte y sentirte mejor contigo misma.",
    "Una rutina más completada ✨ Sigue así, poco a poco estás avanzando.",
    "¡Excelente trabajo! 💪💜 Recuerda que cada esfuerzo que haces hoy es una inversión en ti misma.",
    "Terminaste tu entrenamiento 💜 Ahora disfruta esa satisfacción de saber que hoy también cumpliste contigo.",
    "¡Qué bien! ✨ Me encanta verte comprometida con tu proceso. Sigue confiando en ti y en todo lo que puedes lograr.",
    "Un día más de trabajo por ti 💜💪 Y eso merece reconocerse. ¡Muy bien hecho!",
    "¡Rutina lista! 🔥 Estoy feliz de acompañarte en este proceso y de ver cómo sigues avanzando.",
    "Hoy también elegiste no rendirte 💜 Y eso, aunque parezca pequeño, hace una gran diferencia.",
    "¡Rutina completada! ✨ Un paso más hacia una versión más fuerte de ti. ¡Felicitaciones! 💪💜",
    "¡Lo lograste! 🔥 Gracias por regalarle este tiempo a tu cuerpo y a tu salud.",
    "Cada entrenamiento cuenta. Hoy cumpliste contigo y eso ya es una gran victoria. ✨",
    "¡Muy bien hecho! 💜 Recuerda que la constancia construye los grandes resultados.",
    "Terminaste tu rutina, pero no solo entrenaste tu cuerpo: también fortaleciste tu disciplina. 💪",
    "¡Orgullosa de ti! 🔥 Sigue así, paso a paso estás construyendo la mejor versión de ti.",
    "Hoy no tenías que ser perfecta, solo tenías que dar lo mejor de ti. ¡Y lo hiciste! ✨",
    "Un entrenamiento más, una excusa menos y una versión de ti mucho más fuerte. 💜",
    "Gracias por no rendirte contigo misma. Cada esfuerzo suma. 💪✨",
    "¡Misión cumplida! 🔥 Ahora descansa, recupérate y siéntete orgullosa de lo que lograste hoy.",
    "¡Rutina terminada! 💜 Felicitaciones por darte este tiempo para ti y seguir avanzando en tu proceso.",
    "Hoy también cumpliste contigo 💪💜 Disfruta esa satisfacción de saber que lo diste todo.",
    "¡Muy buen trabajo! ✨ Cada día de esfuerzo te acerca un poquito más a todo lo que quieres lograr.",
    "Terminaste tu rutina 💜 Gracias por confiar en el proceso y, sobre todo, por seguir confiando en ti.",
    "Un entrenamiento más completado 💪✨ Sigue con esa actitud y esa constancia que poco a poco hacen la diferencia.",
    "¡Excelente trabajo hoy! 💜 No olvides reconocer todo el esfuerzo que estás haciendo por ti misma.",
    "Hoy sumaste un día más a tu proceso 💪💜 Y créeme, cada uno de esos días cuenta.",
    "¡Lo hiciste! ✨ Me alegra mucho acompañarte y verte avanzar poco a poco.",
    "Terminaste 💜 Ahora descansa y disfruta la satisfacción de haber cumplido con tu entrenamiento.",
    "Cada vez que eliges entrenar, eliges hacer algo bueno por ti 💜💪 ¡Sigue así!",
    "Un paso más, un día más y una oportunidad más para seguir creciendo 💜✨",
    "¡Qué buen trabajo! 💪 Nunca subestimes todo lo que puedes lograr siendo constante.",
    "Hoy te elegiste a ti 💜 Y eso siempre será una buena decisión.",
    "¡Misión cumplida! 💪✨ Ahora a descansar y recuperar energías para seguir dando lo mejor de ti.",
    "Tu esfuerzo de hoy es parte de los resultados que vas a celebrar mañana 💜 ¡Vamos paso a paso!",
];

/** Para cuando cierra la semana entera: merecen más peso que los diarios. */
export const MENSAJES_SEMANA = [
    "¡Semana completada! 💜 Mira todo lo que lograste con constancia y dedicación. Siéntete muy orgullosa de ti.",
    "¡Lo lograste! 💪✨ Terminaste una semana más de entrenamiento y cada sesión demuestra el compromiso que tienes contigo misma.",
    "Semana cumplida 💜 No importa si todos los días fueron perfectos; lo importante es que seguiste avanzando. ¡Felicitaciones!",
    "¡Qué orgullo! 🔥 Cerraste otra semana de entrenamiento. Todo ese esfuerzo suma y te acerca cada vez más a tus objetivos.",
    "Una semana más superada 💪💜 Tómate un momento para reconocer todo lo que hiciste por ti estos días.",
    "¡Semana completada! ✨ Cada entrenamiento, cada esfuerzo y cada vez que decidiste continuar hicieron parte de este logro.",
    "¡Excelente semana! 💜 La constancia que estás construyendo vale muchísimo. Sigue confiando en tu proceso.",
    "Terminaste la semana 💪✨ Ahora disfruta la satisfacción de saber que cumpliste contigo y diste un paso más hacia tus objetivos.",
    "¡Lo hiciste! 🔥 Una semana más en la que elegiste cuidar de ti. Siéntete orgullosa de todo lo que estás construyendo.",
    "Semana tras semana estás demostrando que puedes ser constante 💜 ¡Felicitaciones por completar una más!",
    "¡Misión cumplida! 💪✨ Cerraste otra semana. Ahora descansa, recupérate y prepárate para seguir avanzando.",
    "Esta semana ya es parte de tu historia 💜 Mira todo lo que lograste y recuerda que cada pequeño esfuerzo cuenta.",
    "¡Semana completada! ✨ No subestimes lo que puedes conseguir cuando decides mantenerte constante.",
    "Otro objetivo cumplido 💪💜 Una semana más de trabajo, disciplina y dedicación. ¡Muy buen trabajo!",
    "¡Estoy muy orgullosa de ti! 🔥 Cerraste una semana más y eso demuestra que estás comprometida con tu proceso.",
    "No necesitas hacerlo perfecto, necesitas seguir adelante 💜 Y esta semana lo demostraste. ¡Felicitaciones!",
    "Una semana más, varios entrenamientos más y muchas razones para sentirte orgullosa 💪✨ ¡Sigue así!",
    "Todo el esfuerzo de esta semana cuenta 💜 Quédate con esa sensación de satisfacción y úsala como motivación para la próxima.",
    "¡Lo lograste! ✨ Cerraste la semana cumpliendo contigo. Ahora celebra tu esfuerzo y recarga energías.",
    "Semana terminada 💪💜 Cada día que entrenaste fue una decisión a favor de ti misma. ¡Y hoy puedes sentirte orgullosa!",
    "¡Excelente trabajo! 🔥 Una semana más de constancia. Sigue avanzando a tu ritmo y confía en todo lo que estás construyendo.",
    "Terminaste otra semana 💜 Tal vez no fue perfecta, pero fue tuya, la trabajaste y la sacaste adelante. ¡Eso merece celebrarse!",
    "¡Semana cumplida! 💪✨ Guarda este logro como recordatorio de que eres capaz de mantenerte firme cuando te lo propones.",
    "Cerraste la semana con una nueva victoria 💜 Descansa, recupera energías y prepárate para todo lo que viene.",
    "Cada semana que completas demuestra que estás construyendo un hábito, no solo cumpliendo una rutina. 💪✨",
    "¡Qué gran semana! 💜 Sigue paso a paso. Los grandes cambios se construyen con pequeñas decisiones repetidas.",
    "Una semana más queda atrás y una nueva oportunidad está por comenzar 💪✨ ¡Siéntete orgullosa de lo que lograste!",
    "¡Felicitaciones! 💜 Terminaste tu semana de entrenamiento. Reconoce tu esfuerzo, disfruta el descanso y vuelve con toda la energía.",
    "Tu constancia está hablando por ti 💪🔥 Una semana más completada y otro paso importante en tu proceso.",
    "¡Semana completada con éxito! ✨ Gracias por seguir apostando por ti, incluso en los días en los que pudo haber sido difícil.",
];

/**
 * Elige de forma determinista: el mismo día siempre muestra el mismo mensaje.
 * Con azar puro se repetiría dos días seguidos y parecería descuidado.
 */
export function mensajeDelDia(semana: number, dia: number): string {
    const indice = (semana * DIAS.length + dia) % MENSAJES_DIA.length;
    return MENSAJES_DIA[indice]!;
}

export function mensajeDeSemana(semana: number): string {
    return MENSAJES_SEMANA[semana % MENSAJES_SEMANA.length]!;
}

/**
 * ¿Ha cerrado ya todos los días del ciclo en esta semana?
 *
 * Se calcula sobre los días distintos registrados, no sobre el número de
 * registros: repetir un día no debe dar la semana por completa.
 */
export function semanaCompletada(diasRegistrados: number[]): boolean {
    const distintos = new Set(diasRegistrados.filter(d => DIAS.includes(d)));
    return DIAS.every(d => distintos.has(d));
}
