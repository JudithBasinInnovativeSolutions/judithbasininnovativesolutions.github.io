[<AutoOpen>]
module site.App

open Fun.Blazor

let app =
    Template.html $"""
<nav id="title-bar">
    <h1>Judith Basin Innovative Solutions</h1>
</nav>

<section class="split">
    <div>
        <h2>Innovative Consulting Solutions with a Montana Flair</h2>
        <p>Expert guidance to elevate your business strategy today!</p>
        <a href="#contact" class="button">Get Your Free Consultation</a>
    </div>
    <img src="https://via.placeholder.com/600x400" alt="Consulting" />
</section>

<section class="split">
    <img src="https://via.placeholder.com/600x400" alt="Expert Guidance" />
    <div>
        <h2>Expert Guidance</h2>
        <p>At Judith Basin Innovative Solutions, we provide expert guidance tailored to your unique challenges. Our experienced consultants work closely with you to develop effective strategies that drive results.</p>
    </div>
</section>

<section id="contact">
    <h2>Contact Us</h2>
    <div class="card">
        <h3>Drop us a line!</h3>
        <form action="mailto:Allen.Simpson@JudithBasinInnovativeSolutions.com" method="post" enctype="text/plain">
            <div><input type="text" name="name" placeholder="Name" /></div>
            <div><input type="email" name="email" placeholder="Email" /></div>
            <div><textarea name="message" placeholder="Message"></textarea></div>
            <div><input type="file" multiple onchange="updateAttachmentCount(event)" /></div>
            <small id="attachment-count">Attachments(0)</small>
            <button type="submit">Send</button>
        </form>
    </div>
</section>

<script>
function updateAttachmentCount(e) {{
    var count = e.target.files.length;
    document.getElementById('attachment-count').innerText = 'Attachments(' + count + ')';
}}
</script>
"""